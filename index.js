const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors')
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const jwt = require('jsonwebtoken');
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
/**
 * function midlware------------
 * **/ 

function verifyJWT (req,res,next){
  const authorization = req.headers.authorization;
  if(!authorization){
    return res.status(401).send({error:true, message:'unauthorized access'})
  }

  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
    if(err){
      console.log(err);
      return res.status(401).send({error:true, message:'unauthrized access'})
    }

    req.decoded = decoded;
    next();
  })

}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const usersCollection = client.db("bistroDB").collection("users");
    const menuCollection = client.db("bistroDB").collection("menu");
    const reviewsCollection = client.db("bistroDB").collection("reviews");
    const cartsCollection = client.db("bistroDB").collection("carts");
    const paymentsCollection = client.db("bistroDB").collection("payments");

    /* reviews collection **/
    app.get('/reviews', async (req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    })

    // *****jwt token******//
    app.post('/jwt',(req,res)=>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET,{expiresIn:'1h'})
      res.send({token});
    })


    // **** Admin verify jwt/
    const adminVerify = async(req,res,next)=>{
      const email = req.decoded.email;
      const query ={email: email};
      const user = await usersCollection.findOne(query);
      if(user?.role !== 'admin'){
        res.status(403).send({error:true, message:'forbidden access'});
      }
      next();
    }

    /***** user realated api ****/ 

    app.get('/users',verifyJWT,adminVerify, async(req,res)=>{
      const result = await usersCollection.find().toArray();
      
      res.send(result);
    })

    app.post('/users', async(req,res)=>{
      const user = req.body;
      const query = {email: user.email};
      const existingUser = await usersCollection.findOne(query);
      // ** existing user will not allow to save in database newly
     
      if(existingUser){
        return res.send({message: 'already exisit'})
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get('/users/admin/:email',verifyJWT, async(req,res)=>{
      const email = req.params.email;

      if(req.decoded.email !== email){
        res.send({admin: false})
      }

      const query ={email: email};
      const user = await usersCollection.findOne(query)
      const result = {admin: user?.role == 'admin'}
      res.send(result);
    })

    app.patch('/users/admin/:id', async(req,res)=>{
      const id  = req.params.id;
      const filter ={_id: new ObjectId(id)};
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);  
    });


    app.delete('/users/admin/:id', async(req,res)=>{
      const id = req.params.id;
      const query ={_id: new ObjectId(id)};
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    })

    //** menu collection */ 
    app.get('/menu', async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    })


    app.post('/menu',verifyJWT, async(req,res)=>{
      const newItem =req.body;
      const result = await menuCollection.insertOne(newItem);
      res.send(result);
    })


    app.delete('/menu/:id', async(req,res)=>{
      const id = req.params.id;
      console.log(id)
      const query ={_id: new ObjectId(id)};
      const result = await menuCollection.deleteOne(query);
      res.send(result);
    })

    //** cart collection */ 
    app.get('/carts', verifyJWT, async (req, res) => {
      const email = req.query.email;
      // console.log(email);
           if (!email) {
        res.send([]);
        // return; // Add this line to stop further execution
      }
      const decodedEmail = req.decoded.email;
      if(email !== decodedEmail){
        return res.status(403).send({error:true, message:'access forbiden'})
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

    //**card payment intenst */ 

    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const { price } = req.body;
      console.log(price);
      const amount = parseFloat(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post('/payment', async(req,res)=>{
      const payment = req.body;
      const result = await paymentsCollection.insertOne(payment);
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