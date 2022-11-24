const express = require('express')
const app = express()
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion } = require('mongodb');

const cors = require('cors')
require('dotenv').config()
app.use(cors())
app.use(express.json())

const username = process.env.DB_USER
const password = process.env.DB_PASSWORD

const uri = `mongodb+srv://${username}:${password}@cluster0.lgdlxzl.mongodb.net/?retryWrites=true&w=majority`;
// console.log(uri)
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        const userCollection = client.db('carhub').collection('user');
        const verifySeller = async (req, res, next) => {
            const email = req.body.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            if (user?.role !== 'Seller') {
                return res.status(403).send({ message: 'forbidden access' })
            }

            next();
        }

        app.get('/user/seller', verifySeller, async(req, res))

        app.put('/user', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    email: user.email,
                    role: user.role,
                    name: user.name,
                    img: user.img
                },
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            console.log(result);
            res.send(result)


        })

    }
    finally {

    }
}
run().catch(error => console.log(error))



app.get('/', (req, res) => {
    res.send('server is running!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})