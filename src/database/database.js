const Datastore = require('nedb')

const collections = {
  users: new Datastore('./src/database/collections/users.db'),
  posts: new Datastore('./src/database/collections/posts.db'),
  postsImages: new Datastore('./src/database/collections/postsimages.db'),
}

collections.users.loadDatabase()
collections.posts.loadDatabase()
collections.postsImages.loadDatabase()

module.exports = collections