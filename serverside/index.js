const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require('bcryptjs');
const multer= require('multer');
const path= require('path');
const UserModel = require('./models/User.js');
const PlaceModel = require('./models/Place.js');
const ChatModel = require('./models/chatmodel.js');
const messageModel = require('./models/messageModel.js');
const Booking = require('./models/Booking.js');
const { app, server } = require('./socket.js');


require('dotenv').config();



app.use(express.json());
app.use(cors({
  credentials: true,
  origin: 'http://localhost:3000',
}));
app.use(express.static('public'));

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB:', err));


const bcryptSalt = bcrypt.genSaltSync(10);

const jwt = require('jsonwebtoken');
const { request } = require("http");
const jwtSecret = 'Q$r2K6W8n!jCW%Zk';


const createToken = (userId) => {
 
    const payload = { 
      userId: userId,
    };
    const token = jwt.sign(payload, "Q$r2K6W8n!jCW%Zk", { expiresIn: "30m" });
    return token;
  };
  
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'public/Images');
    },
    filename: function (req, file, cb) {
      const extension = path.extname(file.originalname);
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + extension);
    },
  });

  const upload = multer({
    storage: storage
  });

  app.get('/', (req, res) => {
    res.send('Hello World! server here');
  });

  app.get("/user", (req, res) => {
    const token = req.headers.authorization;
    console.log("Token received:", token);
    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
  
    jwt.verify(token, jwtSecret, (err, decoded) => {
      if (err) {
        alert('session expired!! Please Login')
        return res.redirect("/login");
      }
      const userId = decoded.userId;
      console.log("Decoded token:", decoded);
      UserModel.findById(userId)
        .then(user => {
          console.log("User found in database:", user);
          if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
          }

          return res.status(200).json({ success: true, name: user.name,useruniqId:userId,userEmail:user.email });
        
        })
        .catch(error => {
          console.error("Error fetching user:", error);
          return res.status(500).json({ success: false, message: "Internal server error" });
        });
    });
  });
  

  app.post("/register", upload.single('image'), async (req, res) => {
    const { name, email, phoneno, password } = req.body;
    const imagePath = req.file.path;

    try {
        const userDoc = await UserModel.create({
            name,
            email,
            phoneno,
            password,
            photo: imagePath
        });
        res.json(userDoc);
    } catch (e) {
        res.status(422).json(e);
    }
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res 
      .status(400)
      .json({ success: false, message: "Email and password are required" });
  } 

  UserModel.findOne({ email })
    .then((user) => {
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      if (user.password !== password) {
        return res.status(401).json({ success: false, message: "Invalid Password!" });
      }
      
      const token = createToken(user._id); 
      
      return res.status(200).json({ success: true, message: "User logged in", token });
    })
    .catch((error) => {
      console.error("Error finding the user:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    });
});



app.get("/api/user/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, user: user });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});



app.post('/places', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'roomPhotos', maxCount: 1 }, { name: 'lobbyPhotos', maxCount: 1 }]), async (req, res) => {
  try {
 
    const { owner, title, address, description,message, checkIn, checkOut, maxGuests, price } = req.body;
    const { oven, swimmingPool, indianToilet, securityCamera, food, refrigerator, laundry, wifi, parking, tv, bed } = req.body.perks;

    const newPlace = new PlaceModel({
      owner,
      title,
      address,
      photos: req.files['image'][0].path, 
      room: req.files['roomPhotos'][0].path,
      lobby: req.files['lobbyPhotos'][0].path,
      description,
      message,
      perks: {
        oven: !!oven, 
        swimmingPool: !!swimmingPool,
        indianToilet: !!indianToilet,
        securityCamera: !!securityCamera,
        food: !!food,
        refrigerator: !!refrigerator,
        laundry: !!laundry,
        wifi: !!wifi,
        parking: !!parking,
        tv: !!tv,
        bed: !!bed,
      },
      checkIn,
      checkOut,
      maxGuests,
      price,
    });

    await newPlace.save();
    res.status(201).send("Place added successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to add place");
  }
});


app.get('/places/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Find all places associated with the current user ID
    const places = await PlaceModel.find({ owner: userId });
    
    res.status(200).json({ success: true, places });
  } catch (error) {
    console.error('Error fetching accommodation places:', error);
    res.status(500).json({ success: false, error: 'An error occurred while fetching accommodation places' });
  }
});

/****View Hotel********/
app.get("/place/:id", async (req, res) => {
  try {
    const placeId = req.params.id;
    const place = await PlaceModel.findById(placeId);

    if (!place) {
      return res.status(404).json({ success: false, message: "Place not found" });
    }

    res.status(200).json({ success: true, place });
  } catch (error) {
    console.error("Error fetching place data:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});



app.delete('/places/delete/:id', async (req, res) => {
  try {
    const placeId = req.params.id;
    await PlaceModel.findByIdAndDelete(placeId);
    res.status(200).json({ success: true, message: 'Accommodation deleted successfully' });
  } catch (error) {
    console.error('Error deleting accommodation:', error);
    res.status(500).json({ success: false, error: 'An error occurred while deleting accommodation' });
  }
});

app.get('/all/places', async (req, res) => {
  try {
    // Find all places in the database
    const places = await PlaceModel.find({});
    res.status(200).json({ success: true, places });
  } catch (error) {
    console.error('Error fetching places:', error);
    res.status(500).json({ success: false, error: 'An error occurred while fetching places' });
  }
});


app.get("/edit/places/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const accommodation = await PlaceModel.findById(id);
    if (accommodation) {
      res.json({ success: true, place: accommodation });
    } else {
      res.status(404).json({ success: false, error: "Accommodation not found" });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put("/places/update/:id", async (req, res) => {
  const id = req.params.id;
  const updatedData = req.body;
  try {
    const updatedPlace = await PlaceModel.findByIdAndUpdate(id, updatedData, { new: true });
    if (updatedPlace) {
      res.json({ success: true, place: updatedPlace });
    } else {
      res.status(404).json({ success: false, error: "Place not found" });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


app.get("/find-users", async (req, res) => {
  try {
    const users = await UserModel.find({}, '_id name'); 
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json(error);
  }
});


const createChat= async(req,res)=>{
  const {firstId,secondId} = req.body

  try{
     const chat = await ChatModel.findOne({
      members:{$all:{firstId,secondId}},
     });
     if(chat)
     {
        return res.status(200).json(chat);
     }
     const newChat = new ChatModel({
      members:[firstId,secondId],
     })

     const response = await newChat.save()
     res.status(200).json(response);
  }
  catch(error){
      console.log(error)
      res.status(500).json(error)
  }
};
app.post("/chat/create/",createChat);


/*******Find User Chats for Display********************/

const findUserChats= async(req,res)=>{
  const userId = req.params.userId;
  //console.log('Logged In User ID:', userId);
  try{
     const chats = await ChatModel.find({
      members:userId,
     });
     res.status(200).json(chats);
  }
  catch(error){
      console.log(error)
      res.status(500).json(error)
  }
};

app.get("/findUserchat/chats/:userId",findUserChats);

app.get("/find/byUserId/:_id", async (req, res) => {
  try {
    const { _id } = req.params;

    if (!_id) {
      console.error("Received request without _id");
      return res.status(400).json({ error: "Invalid request" });
    }

    const user = await UserModel.findOne({ _id });

    if (!user) {
      console.error("User not found for _id:", _id);
      return res.status(404).json({ error: "User not found" });
    }

    const username = user.name;
    return res.status(200).json({ username });
  } catch (error) {
    console.error("Error in /byUserId route:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/*******Message Api**********/

const createMessage = async (req, res) => { 

  const { chatId, senderId, text } = req.body;
  
  const message = new messageModel({
  chatId, senderId, text,
  });
  try {
  const response = await message.save(); 
  res.status(288).json(response);
  }
  catch (error) 
  {
  console.log(error); res.status(588).json(error);
  }
  };
  app.post("/chat/create/messages", createMessage); 


  const getMessages = async (req, res) => {
    const { chatId } = req.params;
   try {
   const messages = await messageModel.find({ chatId }); 
   res.status(288).json(messages);
   } 
   catch (error) 
   {
       console.log(error);
       res.status(588).json(error);
   }
   };
   app.get("/chat/get/messages/:chatId", getMessages);


   /*********Book Hotel Api***********/
   app.post('/book', async (req, res) => {
    try {
      const { placeId, userId, checkInDate, checkOutDate, numGuests,bookingDate} = req.body;
  
      const booking = new Booking({
        placeId,
        userId,
        checkInDate,
        checkOutDate,
        numGuests,
        bookingDate
      });
  
      await booking.save();
  
      res.status(201).json({ success: true, booking });
    } catch (error) {
      console.error('Error creating booking:', error);
      res.status(500).json({ success: false, error: 'Failed to create booking' });
    }
  });

  app.get('/user/bookings', async (req, res) => {
    try {
      const userId = req.query.userId;
      console.log(userId);
      const bookings = await Booking.find({ userId });
      res.status(200).json({ bookings });
    } catch (error) {
      console.error("Error fetching user bookings:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  


server.listen(process.env.PORT, () => {
  console.log(`Server is listening on port ${process.env.PORT}`);
});
