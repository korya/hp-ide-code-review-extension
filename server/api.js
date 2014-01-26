var path = require('path'),
    Q = require('q'),
    moduleLoader = require(path.join(global.rootDirectory, 'core/module-loader')),
    persistence = moduleLoader.loadCoreModule('persistence'),
    validator = require(path.join(global.rootDirectory, 'open-source/validation')),
    config = require(path.join(global.rootDirectory, 'core/config')),
    syncListener = require(path.join(global.rootDirectory, 'core/sync-listener')),
    logger = require(path.join(global.rootDirectory, 'core/logging')).getLogger('pull-requests');

var COLLECTION = 'pull-requests';

var userToIOSocketMap = {};
var ioSocketIdToUserMap = {};

var allocateId;

/* XXX the projection is required by mock persistence */
var proj = {
  author: 1,
  reviewer: 1,
  repository: 1,
  branch: 1,
  baseCommit: 1,
  title: 1,
  description: 1,
  creationDate: 1,
  lastUpdatedDate: 1,
  comments: 1,
  state: 1,
  _id: 1,
};

function getQuery(req) {
  /* The problem with `require('url').parse()` is that it cannot handle
   * nested objects.
   * The problem with express's `req.query`, '__proto__' is added in all objects
   * and subobjects.
   */
  function cleanJSON(obj) {
    for (var p in obj) {
      if (p === '__proto__')
	delete obj[p];
      else if (typeof obj[p] === 'object') {
	cleanJSON(obj[p]);
      }
    }
  }
  cleanJSON(req.query);
  return req.query;
}

function getByFilter(req, res) {
  var dbName = req.cleanedUrl.db;
  var query = getQuery(req);

  console.log('q:', query);
  persistence.getInstance().get(dbName, COLLECTION, query, proj, function (error, result) {
    console.log(error, result);
    if (!error) {
      res.json(200, result);
    } else {
      res.json(404, result);
    }
  });
}

function insert(req, res) {
  var dbName = req.cleanedUrl.db;
  var review = req.body;

  if (allocateId) { review._id = allocateId(); }
  review.state = 'pending';
  review.comments = [];

  persistence.getInstance().insert(dbName, COLLECTION, review, function (error, result) {
    console.log(error, result);
    if (!error) {
      res.json(201, result);
      /* XXX Mock persistence does not returns the whole collection.
       * Mongo DB returns the inserted object.
       */
      ioNotifyUsers(dbName, result[0]._id || review._id, 'review-add');
    } else {
      res.json(500, result);
    }
  });
}

function showComments(req, res) {
  var dbName = req.cleanedUrl.db;
  var id = parseInt(req.params.id);

  getReview(dbName, id).then(function (review) {
    res.json(201, review.comments);
  }, function (error) {
    res.json(500, error);
  });
}

function addComments(req, res) {
  var dbName = req.cleanedUrl.db;
  var id = parseInt(req.params.id);
  var comments = req.body;
  var value;

  getReview(dbName, id).then(function (review) {
    var allComments;

    /* XXX No pushArray operation for mock-persistence */
    if (!Array.isArray(comments)) comments = [comments];
    allComments = review.comments.concat(comments);

    persistence.getInstance().update(dbName, COLLECTION, {_id:id}, {comments: allComments}, function (error, result) {
      if (!error) {
	res.json(201, result);
	ioNotifyUsers(dbName, id, 'review-comments-add', comments);
      } else {
	res.json(500, result);
      }
    });
  }, function (error) {
    res.json(500, error);
  });
}

function setState(req, res) {
  var dbName = req.cleanedUrl.db;
  var id = parseInt(req.params.id);
  var state = req.body.state;
  var value = {state:state};

  if (!state && state !== 'approved' && state !== 'rejected')
  {
    res.json(400, 'Bad request: illegal state');
    return;
  }

  console.log(' *** state: id =', id, ':', value);
  persistence.getInstance().update(dbName, COLLECTION, {_id:id}, value, function (error, result) {
    console.log(error, result);
    if (!error) {
      res.json(201, result);
      ioNotifyUsers(dbName, id, 'review-state-change');
    } else {
      res.json(500, result);
    }
  });
}

function getReview(dbName, reviewId) {
  var get = persistence.getInstance().get;

  return Q.nfcall(get, dbName, COLLECTION, {_id:reviewId}, proj)
    .then(function (result) {
      console.error('res:', result);
      return result[0];
    });
}

function ioNotifyUsers(dbName, reviewId, message, data) {
  console.log(' ------- notify id:', reviewId);

  getReview(dbName, reviewId).then(function (review) {
    var userIds = [review.author.id, review.reviewer.id];

    userIds.forEach(function (userId) {
      if (userToIOSocketMap[userId])
	userToIOSocketMap[userId].emit(message, review, data);
    });
  }, function (err) {
    console.error('Failed to notify:', err);
  });
}

function ioAuthorization(handshake, accept) {
  // accept all
  accept(null, true);
}

function ioOnConnect(socket) {
  console.log('  --- Got connection:', socket.id);

  // XXX this should be done in ioAuthorization()
  socket.on('auth', function (data) {
    var userId = data.id;
    console.log('  +++', userId, 'has associated with', socket.id);
    userToIOSocketMap[userId] = socket;
    ioSocketIdToUserMap[socket.id] = userId;
  });
  socket.on('disconnect', function () {
    var userId = ioSocketIdToUserMap[socket.id];

    console.log('  +++', userId, 'has disconnected');
    delete userToIOSocketMap[userId];
    delete ioSocketIdToUserMap[socket.id];
  });
}

exports.registerListeners = function (app) {
  if (config.database().type !== 'mock') return;

  /* XXX In mock persistence we have to assign _id by ourself */
  syncListener.registerListener('tenantCreated', function (funcArgs) {
    var dbName = funcArgs.db;

    Q.nfcall(persistence.getInstance().get, dbName, COLLECTION, {}, {_id: 1}).then(function (result) {
      var maxId = 0;
      for (var i = 0; i < result.length; i++) {
	if (maxId < result[i]) maxId = result[i];
      }
      return maxId;
    }, function () {
      return 0;
    }).then(function (maxId) {
      allocateId = function () {
	return maxId++;
      };
    });
  });
};

exports.initRoutes = function (app) {
  var io;
  var restServicePath = config.applicationPaths().restServicePath;

  console.log('initializing code-review api:', restServicePath);
  app.get(restServicePath + 'pull-requests', getByFilter);
  app.post(restServicePath + 'pull-requests', insert);
  app.get(restServicePath + 'pull-requests/:id/comments', showComments);
  app.post(restServicePath + 'pull-requests/:id/comments', addComments);
  app.put(restServicePath + 'pull-requests/:id/state', setState);

  io = app.get('io').of('/pull-requests');
  io.authorization(ioAuthorization);
  io.on('connection', ioOnConnect);
};
