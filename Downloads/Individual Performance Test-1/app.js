const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 9020;

app.use(express.json());

mongoose.connect('mongodb://localhost:27017/mongo-test', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
  insertCourses();
}).catch((error) => {
  console.error('MongoDB connection error:', error);
  process.exit(1); // Exit if unable to connect to MongoDB
});

const courseSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  units: {
    type: Number,
    required: true
  },
  tags: {
    type: [String],
    required: true
  }
});

const Course = mongoose.model('Course', courseSchema);

let courses = [];
try {
  fs.readFile('courses.json', 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading curriculum data:', err);
      return;
    }
    const curriculumData = JSON.parse(data);
    courses = curriculumData.flatMap(year => Object.values(year)).flatMap(course => course);
    insertCourses();
  });
} catch (error) {
  console.error('Error reading curriculum data:', error);
}

async function insertCourses() {
  try {
    await Course.deleteMany({});
    await Course.insertMany(courses);
    console.log('Courses inserted successfully');
  } catch (error) {
    console.error('Error inserting courses:', error);
  }
}

app.get('/backend-courses', async (req, res) => {
  try {
    const backendCourses = await Course.find({ tags: { $in: ['Programming', 'Database Management', 'Web Development'] } })
      .select('description tags')
      .sort({ description: 1 });

    res.json(backendCourses);
  } catch (error) {
    console.error('Error retrieving backend courses:', error);
    res.status(500).json({ error: 'Error retrieving backend courses' });
  }
});

app.get('/bsis-bsit-courses', async (req, res) => {
  try {
    const bsisBsitCourses = await Course.find({ tags: { $in: ['BSIS', 'BSIT'] } })
      .select('description tags');

    res.json(bsisBsitCourses);
  } catch (error) {
    console.error('Error retrieving BSIS/BSIT courses:', error);
    res.status(500).json({ error: 'Error retrieving BSIS/BSIT courses' });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

process.on('SIGINT', async () => {
  console.log('Closing server...');
  try {
    await server.close();
    await mongoose.disconnect();
    console.log('Server closed');
    process.exit(0);
  } catch (err) {
    console.error('Error closing server:', err);
    process.exit(1);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});
