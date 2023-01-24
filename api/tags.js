const express = require('express');
const tagsRouter = express.Router();

tagsRouter.use((req, res, next) => {
  console.log("A request is being made to /tags");

  next(); // THIS IS DIFFERENT
});

const { getAllTags } = require('../db');
const { getPostsByTagName } = require('../db');

// UPDATE
tagsRouter.get('/', async (req, res) => {
  const tags = await getAllTags();

  res.send({
    tags
  });
});

tagsRouter.get('/:tagName/posts', async (req, res, next) => {
    // read the tagname from the params
    const tagName = req.params.tagName;
    try {
      // use our method to get posts by tag name from the db
      // send out an object to the client { posts: // the posts }
      
      const allPosts = await getPostsByTagName(tagName);

      const posts = allPosts.filter(post => {
        return post.active || (req.user && post.author.id === req.user.id);
      });

      res.send({
        posts
      });
    } catch ({ name, message }) {
      // forward the name and message to the error handler
      next({ name, message })
    }
  });

module.exports = tagsRouter;