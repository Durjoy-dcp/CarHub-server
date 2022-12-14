const express = require('express')
const app = express()
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const cors = require('cors')
const jwt = require('jsonwebtoken');
const { query } = require('express');
app.use(cors())
app.use(express.json())

const username = process.env.DB_USER
const password = process.env.DB_PASSWORD

const uri = `mongodb+srv://${username}:${password}@cluster0.lgdlxzl.mongodb.net/?retryWrites=true&w=majority`;
// console.log(uri)
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);


function verifyJWT(req, res, next) {
    // console.log(`token inside verifyjwt `, req.headers.authorization);    
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        res.status(401).send('unauthorized access')
    }
    console.log(authHeader)
    const token = authHeader.split(' ')[1];
    if (token === null) {
        console.log('in token')
        res.status(401).send('unauthorized access')

    }
    console.log(token)
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        console.log(decoded)
        next()
    });

}


async function run() {
    try {
        const userCollection = client.db('carhub').collection('user');
        const productCollection = client.db('carhub').collection('product');
        const wishListCollection = client.db('carhub').collection('wishlist');
        const bookedCollection = client.db('carhub').collection('booked');
        const advertiseCollection = client.db('carhub').collection('advertise');
        const myorderCollection = client.db('carhub').collection('myorder');
        const verifySeller = async (req, res, next) => {
            // console.log(req.query.email)
            const email = req.query.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            if (user?.role !== 'Seller') {

                req.role = ''
                req.verified = false
            } else {
                req.verified = false
                req.role = 'Seller'
                // console.log(user.verifiedSeller)
                if (user.verifiedSeller) {
                    req.verified = true
                }
            }
            next();
        }
        const verifyAdmin = async (req, res, next) => {
            // console.log(req.query.email)
            const email = req.query.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            if (user?.role !== 'admin') {

                req.role = ''
            } else {
                req.role = 'admin'
            }
            next();
        }
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const user = await userCollection.findOne(query)
            // console.log(user)
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN);
                return res.send({ accessToken: token })
            }

            res.status(403).send({ accessToken: '' })
        })


        app.get('/user/seller', verifySeller, async (req, res) => {
            // console.log(req?.role, req.verified)
            res.send({ isSeller: req?.role === 'Seller', verified: req.verified });

        })
        app.get('/product', verifyJWT, async (req, res) => {
            const email = req.query.email;

            if (email !== req.decoded.email) {
                res.status(403).send({ message: 'forbidden access' })
            }
            const query = {
                email: email
            }
            const products = await productCollection.find(query).toArray();
            res.send(products);
        })
        app.post('/booking', async (req, res) => {
            const bookedData = req.body;

            const query = {
                serial: bookedData.serial,
                email: bookedData.email

            }
            const alreadyBooked = await bookedCollection.find(query).toArray();
            if (alreadyBooked.length) {
                const msg = `You already booked the ${bookedData.name}`
                return res.send({ acknowledged: false, msg })
            }
            const result = await bookedCollection.insertOne(bookedData);
            res.send(result);
            // console.log(result);

        })
        app.post('/advertise', async (req, res) => {
            const advertise = req.body;
            const query = {
                serial: advertise.id,
            }
            const alreadyadvertised = await advertiseCollection.find(query).toArray();
            if (alreadyadvertised.length) {
                return res.send({ acknowledged: false })
            }
            const result = await advertiseCollection.insertOne(advertise);
            res.send(result);


        })
        app.get('/user/admin', verifyAdmin, async (req, res) => {
            // console.log(req?.role)
            res.send({ isAdmin: req?.role === 'admin' });

        })
        app.post('/productadd', async (req, res) => {
            const data = req.body;
            data.date = new Date(Date.now()).toISOString();
            const resut = await productCollection.insertOne(data);
            res.send(resut);
        })
        // app.post('/bookadd', async (req, res) => {
        //     const data = req.body;
        //     data.date = new Date(Date.now()).toISOString();
        //     const resut = await bookedCollection.insertOne(data);
        //     res.send(resut);

        // })
        app.put('/wishlist', async (req, res) => {
            // const data = req.body;
            // const resut = await wishListCollection.insertOne(data);
            // res.send(resut);
            // , serial: user._id
            const user = req.body;
            const filter = { email: user.email, serial: user._id };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    serial: user._id,
                    email: user.email,
                    catagory: user.catagory,
                    img: user.img,
                    name: user.name,
                    price: user.price,
                    issold: user.issold,
                    newOwner: user.newOwner,
                    txnid: user.txnid
                }
            };
            const result = await wishListCollection.updateOne(filter, updateDoc, options);
            // console.log(result);
            res.send(result)
        })
        app.put('/wishlistfromad', async (req, res) => {
            // const data = req.body;
            // const resut = await wishListCollection.insertOne(data);
            // res.send(resut);
            // , serial: user._id
            const user = req.body;
            const filter = { email: user.email, serial: user._id };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    serial: user.serial,
                    email: user.email,
                    catagory: user.catagory,
                    img: user.img,
                    name: user.name,
                    price: user.price,
                    issold: user.issold,
                    newOwner: user.newOwner,
                    txnid: user.txnid
                }
            };
            const result = await wishListCollection.updateOne(filter, updateDoc, options);
            // console.log(result);
            res.send(result)
        })
        app.put('/verify', verifyAdmin, async (req, res) => {
            if (req.role === 'admin') {
                // console.log(req.body);
                const filter = { email: req.body.email }
                const updateDoc = {
                    $set: {
                        verifiedSeller: true
                    }
                }
                const result = await userCollection.updateMany(filter, updateDoc);
                const result2 = await productCollection.updateMany(filter, updateDoc);
                // console.log(result)
                if (result.acknowledged && result2.acknowledged) {
                    res.send({ msg: true })
                }
                else {
                    res.send({ msg: false })
                }

            }
            else {
                // console.log('this is not admin');
                res.send({ msg: false })
            }

        })
        app.delete('/userdelet', verifyAdmin, async (req, res) => {
            if (req.role === 'admin') {
                const selleremail = req.query.selleremail;
                const query = { email: selleremail }
                const result = await userCollection.deleteMany(query);
                const result2 = await bookedCollection.deleteMany(query);
                const result3 = await productCollection.deleteMany(query);
                const result4 = await advertiseCollection.deleteMany(query);
                if (result2.acknowledged && result3.acknowledged && result4.acknowledged && result.acknowledged) {
                    res.send({ msg: true })
                }
            }

            else {
                // console.log('this is not admin');
                res.send({ msg: false })
            }
        })
        app.put('/payment', async (req, res) => {

            const user = req.body;
            // console.log(user);
            const filter = { serial: user.bookingId };
            // const options = { upsert: true };
            const filter2 = { _id: ObjectId(user.bookingId) }
            const updateDoc = {
                $set: {
                    issold: true,
                    newOwner: user.email,
                    txnid: user.transactionID
                }
            };
            const result = await wishListCollection.updateOne(filter, updateDoc);
            const result2 = await bookedCollection.updateOne(filter, updateDoc);
            const result4 = await advertiseCollection.deleteOne(filter);
            const result3 = await productCollection.updateOne(filter2, updateDoc);
            res.send(result3)
        })
        app.put('/available', async (req, res) => {

            const id = req.body;
            // console.log(id);
            const filter = { serial: id._id };
            const filter2 = { _id: ObjectId(id._id) }
            const updateDoc = {
                $set: {
                    issold: false,
                    newOwner: "",
                    txnid: ""
                }
            };
            const result = await wishListCollection.updateOne(filter, updateDoc);
            const result2 = await bookedCollection.updateOne(filter, updateDoc);
            const result3 = await productCollection.updateOne(filter2, updateDoc);
            res.send(result3)
        })
        app.put('/sold', async (req, res) => {

            const id = req.body;
            // console.log(id);
            const filter = { serial: id._id };
            const filter2 = { _id: ObjectId(id._id) }
            const updateDoc = {
                $set: {
                    issold: true,
                    newOwner: "The Old owner",
                    txnid: "No Payment"
                }
            };
            const result = await wishListCollection.updateOne(filter, updateDoc);
            const result4 = await advertiseCollection.deleteOne(filter);
            const result2 = await bookedCollection.updateOne(filter, updateDoc);
            const result3 = await productCollection.updateOne(filter2, updateDoc);
            res.send(result3)
        })

        app.get('/wishlist', verifyJWT, async (req, res) => {
            const email = req.query.email;
            if (email !== req.decoded.email) {
                res.status(403).send({ message: 'forbidden access' })
            }
            const query = {
                email: email
            }
            const products = await wishListCollection.find(query).toArray();
            res.send(products);
        })
        app.get('/user', async (req, res) => {
            const email = req.query.email;
            const query = {
                role: req.query.role
            }
            const products = await userCollection.find(query).toArray();
            res.send(products);
        })
        app.get('/bookinglist', verifyJWT, async (req, res) => {
            const email = req.query.email;
            if (email !== req.decoded.email) {
                res.status(403).send({ message: 'forbidden access' })
            }
            const query = {
                email: email
            }
            const products = await bookedCollection.find(query).toArray();
            res.send(products);
        })
        app.get('/advertise', async (req, res) => {

            const query = {

            }
            const products = await advertiseCollection.find(query).toArray();
            res.send(products);
        })

        app.get('/catagory/:id', async (req, res) => {
            const catagory = req.params.id;
            // console.log("it is here")
            const query = { catagory: catagory, issold: false };
            const result = await productCollection.find(query).toArray();
            // console.log(result)
            // console.log(result);
            res.send(result);
        })
        app.get('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            // console.log(id);
            const query = { _id: ObjectId(id) };
            const booking = await productCollection.findOne(query);
            // console.log(booking, "df");
            res.send(booking);
        })
        app.post("/create-payment-intent", async (req, res) => {
            const booking = req.body;
            const price = booking.price;
            //Here multiplying by 1 instead of 100 because if the number is big ,it is a problem to handle for stripe 
            const amount = price * 1;
            console.log(price)
            console.log(amount)
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                "payment_method_types": [
                    "card"
                ],

            });
            // console.log(paymentIntent.client_secret)
            res.send({
                clientSecret: paymentIntent.client_secret,

            })
        })
        app.delete('/car/:id', async (req, res) => {
            const id = req.params.id;
            // console.log(id);
            const filter = { serial: id };
            const filter2 = { _id: ObjectId(id) }

            const result = await bookedCollection.deleteOne(filter);
            const result2 = await wishListCollection.deleteOne(filter);
            const result4 = await advertiseCollection.deleteOne(filter);
            const result3 = await productCollection.deleteOne(filter2);
            res.send(result3);

        })
        app.put('/user', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    email: user.email,
                    role: user.role,
                    name: user.name,
                    img: user.img,
                    verifiedSeller: false
                },
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            // console.log(result);
            res.send(result)


        })
        app.get('/all', async (req, res) => {
            const filter = {};
            const result = await productCollection.find(filter).toArray();
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
    // console.log(`Example app listening on port ${port}`)
})