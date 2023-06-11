const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;

const app = express();
app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://subhambanerjee1411:${process.env.DB_PASSWORD}@cluster0.xr2pzvm.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

//MIDDLEWARE
function verifyJWT(req, res, next) {
  const authorization = req.headers.authorization;
  console.log(authorization);
  if (!authorization) {
    return res.status(401).send({ error: "Unauthorized access!" });
  }

  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    console.log({ err });
    if (err) {
      return res.status(403).send({ error: "Unauthorized access!" });
    }
    req.decoded = decoded;
    next();
  });
}



async function run() {
  try {
    const usersCollection = client.db("music-warehouse-DB").collection("users");
    const classCollection = client.db("music-warehouse-DB").collection("class");

    app.get("/all-course", async (req, res) => {
      const course  = await courseCollection.find().toArray();
      res.send({technologies});
    });

    //GENERATE JWT TOKEN
    app.post("/jwt", async (req, res) => {
      const body = req.body;
      const token = jwt.sign(body, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "30days",
      });
      res.send({ token });
    });

    //ADMIN Varification
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.usermailID;
      const query = { usermailID: email }
      const user = await usersCollection.findOne(query);
      if (user?.userRole !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden message' });
      }
      next();
    }

    const verifyInstructor = async (req, res, next) => {
      const email = req.decoded.usermailID;
      const query = { usermailID: email }
      const user = await usersCollection.findOne(query);
      if (user?.userRole !== 'instructor') {
        return res.status(403).send({ error: true, message: 'forbidden message' });
      }
      next();
    }

    //GET all USERS
    app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    //GET all CLASS for ADMIN
    app.get('/class/admin', verifyJWT, verifyAdmin, async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    });
    app.get('/class/instructor', verifyJWT, verifyInstructor, async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    });

    //Class APPROVAL BY ADMIN
    app.patch('/class/admin/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id)};
      const updateDoc = {
        $set: {
          approval: 'accepted'
        },
      };
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    //Class REJECT BY ADMIN
    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { userID: id };
      const updateDoc = {
        $set: {
          userRole: 'admin'
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    //ADD NEW CLASS BY INSTRUCTOR
    app.post('/class', verifyJWT, verifyInstructor, async (req, res) => {
      const newItem = req.body;
      const result = await classCollection.insertOne(newItem)
      res.send(result);
    })

    //Verify ADMIN User LOGIN
    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      console.log(req.decoded)
      const query = { usermailID: email }
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.userRole === 'admin' }
      res.send(result);
    })

    //Verify Intructor user Login
    app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      console.log(req.decoded)
      const query = { usermailID: email }
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.userRole === 'instructor' }
      res.send(result);
    })

    //make Student USER ADMIN
    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { userID: id };
      const updateDoc = {
        $set: {
          userRole: 'admin'
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    //make Instructor USER ADMIN
    app.patch('/users/instructor/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { userID: id };
      const updateDoc = {
        $set: {
          userRole: 'instructor'
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    //POST on USERS
    app.post("/users", async (req, res) => {
      const user = req.body;
      console.log(user)
      const query = { usermailID: user.usermailID };
      console.log(query)
      const existingUser = await usersCollection.findOne(query);
      console.log(existingUser)
      if (existingUser) {
        return res.send(existingUser);
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    //UPDATE SINGLE CLASS
    app.put("/class/instructor/:id",verifyJWT,async (req, res) => {
      const id = req.params.id;
      const body = req.body;
      console.log(body);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          className: body.className,
          classImage: body.classImage,
          classAvailableSeats: body.classAvailableSeats,
          classPrice: body.classPrice,
        },
      };
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    });



    app.get("/my-cart", verifyJWT, async (req, res) => {
      const myEmail = req.query.email;
      if (!myEmail) {
        return res
          .status(403)
          .send({ error: "no info of the customer found!" });
      }
      if (req.decoded.email !== myEmail) {
        return res.status(403).send({ error: "Unauthorized access!" });
      }
      const queryFilter = { purchasedBy: myEmail };
      // const myCart = await cartCollection.find({purchasedBy:myEmail}).toArray();
      const myCart = await cartCollection
        .aggregate([
          { $match: queryFilter },
          {
            $facet: {
              documents: [{ $skip: 0 }, { $limit: 10 }], // Example: find the first 10 documents
              totalCount: [{ $count: "count" }],
            },
          },
        ])
        .toArray();
      res.send(myCart);
    });
    // Get all the orders.
    app.get("/all-orders", async (req, res) => {
      const queryFilter = {};
      // const myCart = await cartCollection.find({purchasedBy:myEmail}).toArray();
      // const total = await cartCollection.countDocuments();
      const orders = await cartCollection
        .aggregate([
          { $match: queryFilter },
          {
            $facet: {
              documents: [{ $skip: 0 }, { $limit: 10 }], // Example: find the first 10 documents
              totalCount: [{ $count: "count" }],
            },
          },
        ])
        .toArray();
      res.send(orders);
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.post("/generate-jwt", async (req, res) => {
  const body = req.body;
  console.log({ body });
  const token = jwt.sign(body, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "1h",
  });
  res.send({ token });
});

app.get("/", (req, res) => {
  res.send({ message: "server says hi!" });
});
app.listen(port, () => console.log(`app is listening at port ${port}`));