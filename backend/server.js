require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const PDFDocument = require('pdfkit');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const app = express();
app.use(cors());
app.use(express.json()); 

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

mongoose.connect(process.env.MONGO_URI, { family: 4 })
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', UserSchema);

const BookingSchema = new mongoose.Schema({
    userId: String,
    passengerName: String,
    source: String,
    destination: String,
    transportType: String,
    foodPref: String,
    stayDuration: String,
    date: String,
    ticketUrl: String
});
const Booking = mongoose.model('Booking', BookingSchema);

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        let user = await User.findOne({ email });
        if (!user) {
            user = new User({ email, password });
            await user.save();
        }
        res.status(200).json({ message: 'Login successful!', userId: user._id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/bookings/book', async (req, res) => {
    try {
        const { userId, passengerName, source, destination, date, transportType, foodPref, stayDuration } = req.body;
        const pnr = 'T1-' + Math.random().toString(36).substr(2, 9).toUpperCase();

        const doc = new PDFDocument({ margin: 50 });
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        
        // Header
        doc.rect(0, 0, 612, 100).fill('#2c3e50'); 
        doc.fillColor('white').fontSize(30).text('TRAVEL1', 50, 40);
        doc.fontSize(10).text('SECURE CLOUD BOARDING PASS', 50, 75);

        // Body
        doc.fillColor('black').fontSize(20).text('E-TICKET', 50, 130);
        doc.fontSize(10).text(`PNR: ${pnr}`, 480, 135);
        doc.moveTo(50, 155).lineTo(550, 155).stroke();

        doc.fontSize(12).text(`PASSENGER: ${passengerName.toUpperCase()}`, 50, 180);
        doc.text(`TRANSPORT: ${transportType}`, 50, 205);
        doc.text(`MEAL: ${foodPref}`, 250, 205);
        doc.text(`STAY: ${stayDuration}`, 420, 205);
        
        doc.fontSize(18).text(`${source.toUpperCase()}`, 50, 260);
        doc.fontSize(10).text('ORIGIN', 50, 280);
        doc.fontSize(18).text(`>>>`, 280, 260);
        doc.fontSize(18).text(`${destination.toUpperCase()}`, 450, 260);
        doc.fontSize(10).text('DESTINATION', 450, 280);

        doc.moveTo(50, 310).lineTo(550, 310).stroke();
        doc.fontSize(12).text(`DEPARTURE DATE: ${date}`, 50, 330);

        // VIKING Watermark
        doc.fontSize(40).fillColor('#eeeeee').text('VIKING', 200, 500, { opacity: 0.1 });
        
        // Footer
        doc.fontSize(8).fillColor('grey').text('TRAVEL1 Systems | Verified by AWS S3', 50, 700, {align: 'center'});
        doc.end();

        doc.on('end', async () => {
            const pdfData = Buffer.concat(buffers);
            const fileName = `VIKING-ticket-${Date.now()}.pdf`;

            const uploadParams = {
                Bucket: process.env.S3_BUCKET_NAME,
                Key: fileName,
                Body: pdfData,
                ContentType: 'application/pdf'
            };

            await s3Client.send(new PutObjectCommand(uploadParams));
            const ticketUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

            const newBooking = new Booking({ userId, passengerName, source, destination, date, transportType, foodPref, stayDuration, ticketUrl });
            await newBooking.save();

            res.status(200).json({ message: 'Success', ticketUrl });
        });

    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 VIKING TRAVEL1 Live on Port ${PORT}`));