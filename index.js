const express = require('express');
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bzlxepd.mongodb.net/?retryWrites=true&w=majority`;


const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// my created middleware

const verifyToken = async (req, res, netx) => {
    const token = req?.cookies?.token;
    console.log("value of token in middleware", token);

    if (!token) {
        return res.status(401).send({ message: 'Not Authorized' })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        // error
        console.log(error);
        if (error) {
            return res.status(401).send({ message: 'Not Authorized' })
        }
        // if valid

        // console.log('value in the token', decoded);
        req.user = decoded;
        netx()
    })

}

async function run() {
    try {
        await client.connect();
        const categoryCollection = client.db('jobSearch').collection('jobCategory');
        const candidateCollection = client.db('candidateList').collection('candidates')
        // auth related API
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            console.log(user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '2h' })

            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: false,
                    // sameSite: 'none'
                })
                .send({ success: true })
        })




        // post a job
        app.post('/categories', async (req, res) => {
            const categoryJob = req.body;
            const result = await categoryCollection.insertOne(categoryJob);
            console.log(result);
            res.send(result);
        })


        // get all job
        app.get('/categories', async (req, res) => {
            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const cursor = categoryCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })
        // get a single job

        app.get('/categories/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await categoryCollection.findOne(query);
            res.send(result);
        })
        // delete job
        app.delete('/categories/:id', async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: new ObjectId(id),
            }
            const result = await categoryCollection.deleteOne(query);
            res.send(result)
        })

        // update job

        app.put('/categories/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true };
            const updateJob = req.body;
            const updatedJob = {
                $set: {

                    image: updateJob.image,
                    title: updateJob.title,
                    person_name: updateJob.person_name,
                    category: updateJob.category,
                    salary: updateJob.salary,
                    postingDate: updateJob.postingDate,
                    deadline: updateJob.deadline,
                    description: updateJob.description,
                    applicantNumber: updateJob.applicantNumber,
                    skills: updateJob.skills,
                    company_name: updateJob.company_name,
                    location: updateJob.location
                }
            }
            const result = await categoryCollection.updateOne(filter, updatedJob, options);
            res.send(result)

        })

        // post candidate list
        app.post('/candidates', async (req, res) => {
            const candidates = req.body;
            try {
                const jobId = new ObjectId(candidates.jobId);
                await categoryCollection.updateOne(
                    { _id: jobId },
                    { $inc: { applicants: 1 } }
                );
                const result = await candidateCollection.insertOne(candidates);
                res.send(result);
            } catch (error) {
                console.error('Error:', error);
                res.status(500).send('Server error');
            }
        });

        // get candidate list 
        app.get('/candidates', verifyToken, async (req, res) => {
            // console.log('user in the valid token', req.user);
            if (req.query.email !== req.user.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const cursor = candidateCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })



        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('job search server is running')
})

app.listen(port, () => {
    console.log(`job search server is running on port ${port}`)
})