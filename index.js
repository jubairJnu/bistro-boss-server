const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors')
require('dotenv').config();

app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.d8yzbln.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const usersCollection = client.db("bistroDB").collection("users");
    const menuCollection = client.db("bistroDB").collection("menu");
    const reviewsCollection = client.db("bistroDB").collection("reviews");
    const cartsCollection = client.db("bistroDB").collection("carts");
    /* reviews collection **/
    app.get('/reviews', async (req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    })

    /***** user realated api ****/ 

    app.get('/users',async(req,res)=>{
      const result = await usersCollection.find().toArray();
      res.send(result);
    })

    app.post('/users', async(req,res)=>{
      const user = req.body;
      const query = {email: user.email};
      const existingUser = await usersCollection.findOne(query);
      // ** existing user will not allow to save in database newly
      console.log('existing user',existingUser);
      if(existingUser){
        return res.send({message: 'already exisit'})
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })

    //** menu collection */ 
    app.get('/menu', async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    })

    //** cart collection */ 
    app.get('/carts', async (req, res) => {
      const email = req.query.email;
      console.log(email);
      if (!email) {
        res.send([]);
        return; // Add this line to stop further execution
      }
      const query = { email: email };
      const result = await cartsCollection.find(query).toArray();
      res.send(result);
    });
  

    app.post('/carts', async (req, res) => {
      const item = req.body;
      const result = await cartsCollection.insertOne(item);
      res.send(result);
    })

    app.delete('/carts/:id', async(req,res) =>{
      const id = req.params.id;
      const query ={_id: new ObjectId(id)};
      const result = await cartsCollection.deleteOne(query);
      res.send(result);
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('boss is comming')
})


app.listen(port, () => {
  console.log(`boss is runnig on${port}`);
})