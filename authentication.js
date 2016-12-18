var db = require('./database');

module.exports = {
  database : 'OrderBase',
  collection : 'AccessTokens',
  generateToken : function (user, callback) {
    var token = {
      userId : user._id
    }
    // Persist and return the token
    db.insert(this.database, this.collection, token,
      function (err, res) {
        if (err) {
          callback(err, null);
        } else {
          callback(err, res);
        }
    });
  },
  authenticate : function (user, password, callback) {
    if (user.password === password) {
      // Create a new Token for the user
      this.generateToken(user, function (err, res) {
        callback(null, res);
      });
    } else {
      callback({
        error : 'Authentication error',
        message : 'Incorrect username or password'
      }, null);
    }
  },
  tokenOwnerHasRole: function (token, roleName, callback) {
    var database = this.database;
    db.find(database, 'User', {_id: token.userID}, function (err, user) {
      db.find(database, 'Role', {_id: user.roleID}, function (err, role) {
        if(err){
          callback(err, false);
        } else if (role.name === roleName) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      });
    });
  }
}
