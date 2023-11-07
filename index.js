const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bzlxepd.mongodb.net/?retryWrites=true&w=majority`;


const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();
        const categoryCollection = client.db('jobSearch').collection('jobCategory');
        const candidateCollection = client.db('candidateList').collection('candidates')
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
        app.get('/candidates', async (req, res) => {
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