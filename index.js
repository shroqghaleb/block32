const pg = require('pg');
const express = require('express');

const client = new pg.Client(process.env.DATABASE_URL || 'postgres://localhost/the_acme_notes_db');
const app = express();
const morgan = require('morgan')
app.use(morgan('dev'))
app.use(express.json())

app.get('/', (req,res,next) => {
    res.send('hello world')
})

app.get('/api/notes', async (req,res,next) => {
    try {
        const SQL = `SELECT * FROM notes`;
        const response = await client.query(SQL);
        res.send(response.rows);
    } catch (error) {
        next(error);
    }
})

app.get('/api/notes/:id', async (req,res,next) => { 
    try {
        const SQL = `SELECT * FROM notes WHERE id = $1`;
        const response = await client.query(SQL, [req.params.id]);
        res.send(response.rows[0]);
    } catch (error) {
        next(error);
    }
  })

app.post('/api/notes', async (req,res,next) => {
  try {
    console.log(req.body)
    const SQL = `INSERT INTO notes (id, name, is_favorite, created_at, updated_at) VALUES ($1, $2, $3, $4, $5) RETURNING *`;
    const response = await client.query(SQL, [req.body.id, req.body.name, req.body.is_favorite, req.body.created_at, req.body.updated_at]);
    res.send(response.rows[0]);
  } catch (error) {
    next(error);
  }
  })
  app.delete('/api/notes/:id', async (req,res,next) => {
    try {
        const SQL = `
            DELETE
            FROM notes
            WHERE id = $1
        `
        await client.query(SQL, [req.params.id])
        res.sendStatus(204)

    } catch (error) {
        next(error)
    }
})

app.put('/api/notes/:id', async (req,res,next) => {  
    try {
        const SQL = `
            UPDATE notes
            SET name = $1, is_favorite = $2, created_at = $3, updated_at = $4
            WHERE id = $5 
            RETURNING *
        `
        const response = await client.query(SQL, [req.body.name, req.body.is_favorite, req.body.created_at, req.body.updated_at, req.params.id])
        res.send(response.rows[0])
    } catch (error) {
        next(error)
    }
})

const init = async () => {
    await client.connect();
    console.log('connected to database');
    
   
    let SQL = `
        DROP TABLE IF EXISTS flavors;
        CREATE TABLE flavors(
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            is_favorite BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT now(),
            updated_at TIMESTAMP DEFAULT now()
        );
    `;
    await client.query(SQL);
    console.log('tables created');
    
   
    SQL = `
        INSERT INTO flavors(name, is_favorite) 
        VALUES 
            ('Vanilla', true),
            ('Chocolate', true),
            ('Strawberry', false),
            ('Mint', false);
    `;
    await client.query(SQL);
    console.log('data seeded');

  
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`Server is listening on port ${port}`);
    });
};

// Routes
// GET all flavors
app.get('/api/flavors', async (req, res, next) => {
    try {
        const SQL = 'SELECT * FROM flavors';
        const response = await client.query(SQL);
        res.send(response.rows);
    } catch (error) {
        next(error);
    }
});

// GET single flavor
app.get('/api/flavors/:id', async (req, res, next) => {
    try {
        const SQL = 'SELECT * FROM flavors WHERE id = $1';
        const response = await client.query(SQL, [req.params.id]);
        if (response.rows.length === 0) {
            res.status(404).send('Flavor not found');
        } else {
            res.send(response.rows[0]);
        }
    } catch (error) {
        next(error);
    }
});

// POST new flavor
app.post('/api/flavors', async (req, res, next) => {
    try {
        const { name, is_favorite } = req.body;
        const SQL = 'INSERT INTO flavors(name, is_favorite) VALUES($1, $2) RETURNING *';
        const response = await client.query(SQL, [name, is_favorite]);
        res.status(201).send(response.rows[0]);
    } catch (error) {
        next(error);
    }
});

// DELETE flavor
app.delete('/api/flavors/:id', async (req, res, next) => {
    try {
        const SQL = 'DELETE FROM flavors WHERE id = $1';
        await client.query(SQL, [req.params.id]);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// PUT update flavor
app.put('/api/flavors/:id', async (req, res, next) => {
    try {
        const { name, is_favorite } = req.body;
        const SQL = 'UPDATE flavors SET name = $1, is_favorite = $2, updated_at = now() WHERE id = $3 RETURNING *';
        const response = await client.query(SQL, [name, is_favorite, req.params.id]);
        if (response.rows.length === 0) {
            res.status(404).send('Flavor not found');
        } else {
            res.send(response.rows[0]);
        }
    } catch (error) {
        next(error);
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send('Internal Server Error');
});

init();