const { Client } = require('pg'); // imports the pg module

// supply the db name and location of the database
const client = new Client('postgres://localhost:5432/juicebox-dev');

async function createUser({ username, password, name, location }) {
    try {
        const { rows: [ user ] } = await client.query(`
        INSERT INTO users(username, password, name, location) 
        VALUES($1, $2, $3, $4) 
        ON CONFLICT (username) DO NOTHING 
        RETURNING *;
        `, [username, password, name, location]);

    return user;
    } catch (error) {
    throw error;
    }
}

async function getAllUsers() {
    try {
        const { rows } = await client.query(`
            SELECT id, username, name, location, active 
            FROM users;
        `);

        return rows;
    } catch (error) {
        throw error;
    }
}

async function getPostsByUser(userId) {
    try {
        const { rows: postIds } = await client.query(`
            SELECT id 
            FROM posts 
            WHERE "authorId"=${ userId };
        `);

        const posts = await Promise.all(postIds.map(
            post => getPostById( post.id )
        ));

        return posts;
    } catch (error) {
        throw error;
    }
}

async function getUserById(userId) {
    try {
        const { rows: [ user ] } = await client.query(`
            SELECT id, username, name, location, active
            FROM users
            WHERE id=${ userId };
        `);

        if (!user) {
            return null
        }

        user.posts = await getPostsByUser(userId);

        return user;
    } catch (error) {
        throw error;
    }
}

async function createPost({ authorId, title, content, tags=[] }) {
    try {
        console.log("Starting to create posts...");
        const { rows: [ post ] } = await client.query(`
            INSERT INTO posts("authorId", title, content) 
            VALUES($1, $2, $3) 
            RETURNING *;
        `, [authorId, title, content]);

        const tagList = await createTags(tags);

        console.log("Finished creating posts!");
        return await addTagsToPost(post.id, tagList);
    } catch(error) {
        console.error("Error creating posts!");
        throw error;
    }
}

async function getAllPosts() {
    try {
        const { rows: postIds } = await client.query(`
            SELECT id
            FROM posts;
        `);

        const posts = await Promise.all(postIds.map(
            post => getPostById( post.id )
        ));

        return posts;
    } catch (error) {
        throw error;
    }
}

async function getPostById(postId) {
    try {
        const { rows: [ post ]  } = await client.query(`
            SELECT *
            FROM posts
            WHERE id=$1;
        `, [postId]);

        const { rows: tags } = await client.query(`
            SELECT tags.*
            FROM tags
            JOIN post_tags ON tags.id=post_tags."tagId"
            WHERE post_tags."postId"=$1;
        `, [postId])

        const { rows: [author] } = await client.query(`
            SELECT id, username, name, location
            FROM users
            WHERE id=$1;
        `, [post.authorId])

        post.tags = tags;
        post.author = author;

        delete post.authorId;

        return post;
    } catch (error) {
        throw error;
    }
}

async function createTags(tagList) {
    if (tagList.length === 0) { 
        return; 
    }
  
    // need something like: $1), ($2), ($3
    const insertValues = tagList.map(
        (_, index) => `$${index + 1}`).join('), (');
    // then we can use: (${ insertValues }) in our string template
  
    // need something like $1, $2, $3
    const selectValues = tagList.map(
        (_, index) => `$${index + 1}`).join(', ');
    // then we can use (${ selectValues }) in our string template
  
    try {
        // insert the tags, doing nothing on conflict
        // returning nothing, we'll query after
        await client.query(`
        INSERT INTO tags(name)
        VALUES (${ insertValues })
        ON CONFLICT (name) DO NOTHING;
        `, tagList);
        // select all tags where the name is in our taglist
        // return the rows from the query
        
        const { rows } = await client.query(`
        SELECT * FROM tags
        WHERE name
        IN (${ selectValues });
        `, tagList);
        
        return rows;
    } catch (error) {
        console.error("Error creating tags!");
      throw error;
    }
}

async function getAllTags() {
    try {
        const { rows } = await client.query(`
            SELECT * 
            FROM tags;
        `);

        return rows;
    } catch (error) {
        throw error;
    }
}

async function createPostTag(postId, tagId) {
    try {
        await client.query(`
            INSERT INTO post_tags("postId", "tagId")
            VALUES ($1, $2)
            ON CONFLICT ("postId", "tagId") DO NOTHING;
        `, [postId, tagId]);
    } catch (error) {
        throw error;
    }
}

async function addTagsToPost(postId, tagList) {
    try {
        const createPostTagPromises = tagList.map(
            tag => createPostTag(postId, tag.id)
        );

        await Promise.all(createPostTagPromises);

        return await getPostById(postId);
    } catch (error) {
        throw error;
    }
}

async function getPostsByTagName(tagName) {
    try {
    const { rows:postIds } = await client.query(`
        SELECT posts.id
        FROM posts
        JOIN post_tags ON posts.id=post_tags."postId"
        JOIN tags ON tags.id=post_tags."tagId"
        WHERE tags.name=$1;
    `, [tagName]);

    return await Promise.all(postIds.map(
        post => getPostById(post.id)
    ));
    } catch (error) {
    throw error;
    }
} 
  
// and export them
module.exports = {
    client,
    getAllUsers,
    getAllPosts,
    getAllTags,
    getPostsByUser,
    getUserById,
    getPostById,
    getPostsByTagName,
    addTagsToPost,
    createUser,
    createPost,
    createTags
}