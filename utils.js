define([
], function () {

  var _users = {};

  /* XXX Load the user list once and on the very beginning,
   * hopefully it is loaded until the review code page is shown.
   */
  $.getJSON('/services/rest/v1/users').done(function (users) {
    _users = {};
    _.forEach(users, function (user) {
      user.id = user.username;
      user.fullName = user.name.familyName + ' ' + user.name.givenName;
      _users[user.username] = user;
    });
  });

  return {
    getUsers: function () { return _users; },
  }
});
