var http = require('http');
var url = require('url');
var database = require('./database');
var mongo = require('mongodb'); // To convert _id to instance of mongo ObjectId
var authentication = require('./authentication');

// Generic find methods (GET)
function findAllResources(resourceName, req, res) {
  database.find('OrderBase', resourceName, {},
  function (err, resources) {
    res.writeHead(200, {'Content-Type' : 'application/json'});
    res.end(JSON.stringify(resources));
  });
};
var findResourceById = function(resourceName, id, req, res) {
  database.find('OrderBase', resourceName, {'_id' : new mongo.ObjectId(id)},
  function(err, resource) {
    res.writeHead(200, {'Content-Type' : 'application/json'});
    res.end(JSON.stringify(resource));
  });
};
var findAllProducts = function (req, res) {
  findAllResources('Products', req, res);
};
var findProductById = function (id, req, res) {
  findResourceById('Products', id, req, res);
};

// Generic insert/update methods (POST, PUT)
var insertResource = function (resourceName, resource, req, res) {
  database.insert('OrderBase', resourceName, resource, function
  (err, resource) {
    console.log("insertResource resource: " + resource)
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(resource));
  });
};
// user methods
var insertUser = function (user, req,res) {
  insertResource(`User`, user, req, res);
};
var findUserByEmail = function (email, callback) {
database.find('OrderBase', 'User', {email: email}, function(err, user) {
  if (err) {
    callback(err, null);
  } else {
    callback(null, user);
  }
  });
};
// Product methods
var insertProduct = function (product, req, res) {
  insertResource('Products', product, req, res);
};

var server = http.createServer(function (req, res) {
  //Break down the incoming URL
  var parsedURL = url.parse(req.url, true);
  switch (parsedURL.pathname) {
    case '/api/products':
      if (req.method === 'GET') {
        // Find and return the product with the given id
        if (parsedURL.query.id) {
          findProductById(parsedURL.query.id, req, res);
        } else {
          findAllProducts(req, res);
        }
      } else if (req.method === 'POST') {
        //Extract the data stored in the POST body
        var body = '';
        req.on('data', function (dataChunk) {
        body += dataChunk;
        });
        req.on('end', function () {
          // Done pulling data from the POST body.
          // Turn it into JSON and proceed to store it in the database.
          var postJSON = JSON.parse(body);
          // Verify access rights
          getTokenById(postJSON.token, function (err, token) {
            authentication.tokenOwnerHasRole(token, 'PRODUCER',
            function (err, result) {
              if (result) {
                insertProduct(postJSON, req, res);
              } else {
                res.writeHead(403, {"Content-Type": "application/json"});
                res.end(JSON.stringify({
                  error: "Authentication failure",
                  message: "You do not have permission to perform that action"
                }));
              }
            });
          });
        });
      }
      break;
      case `/api/users/register`:
      if (req.method == `POST`) {
        var body = "";
        req.on(`data`, function (datachunk) {
          body += datachunk;
        });
        req.on(`end`, function () {
          // Done pulling data from the POST body.
          // Turn it into JSON and proceed to store.
          var postJSON = JSON.parse(body);
          // validate that the required fields exist
          if (postJSON.email &&
            postJSON.password &&
            postJSON.firstName &&
             postJSON.lastName) {
               insertUser(postJSON, req, res);
             } else {
               res.end('All mandatory fields must be provided');
             }
        });
      }
      break;
      case `/api/users/login`:
      if (req.method === `POST`) {
        var body = "";
        req.on(`data`, function (datachunk) {
          body += datachunk;
        });
        req.on(`end`, function () {
          var postJSON = JSON.parse(body);
          // Make sure that email and password have been provided
          if (postJSON.email && postJSON.password) {
            findUserByEmail(postJSON.email, function (err, user) {
              if (err) {
                res.writeHead(404, {"Content-Type": "application/json"});
                res.end(JSON.stringify({
                  error: "User not found",
                  message: "No user found for the specified email"
                }));
              } else {
                authentication.authenticate(user[0], postJSON.password,
                  function(err, token) {
                    if (err) {
                      res.writeHead(404, {"Content-Type": "application/json"});
                      res.end(JSON.stringify({
                        error: "Oops something went wrong",
                        message: "Couldn't login the specified user,"+
                        " check your credentials and try again"
                      }));
                    } else {
                      res.writeHead(200, {"Content-Type": "application/json"});
                      res.end(JSON.stringify(token));
                    }
                  });
              }
            });
          } else {
            res.end('All mandatory fields must be provided');
          }
        });
      }
      break;
    default:
      res.end('Not found');
  }
});
server.listen(8088);
console.log('Up, running and ready for action 1');
