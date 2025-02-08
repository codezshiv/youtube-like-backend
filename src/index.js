// require('dotenv').config({path: './env'});

import dotenv from "dotenv";
import connectDB from "./db/index.js";

dotenv.config({
    path: "./env"
})

connectDB();





// Always add try and catch and async await for database connection for better performanace and error handling
//below we can add semicolon bcz it help to reduce error in multiteam project it is used in professional level

// below is our first approach to connect database but we can take new approach to connect database that are more cleaner and more secure and more approachable we use db folder to connect database this approach cover how we can divide our work in more effiecient way 
//1st approach to connect database
/*
import express from "express";

const app = express();

;( async () => {
    try{
       await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
       app.on("error", (error) => {
        console.log("ERROR: ", error);
        throw error;
       })

       app.listen(process.env.PORT, () => {
        console.log(`App is listening on port ${process.env.PORT}`);
       })

    }catch(error){
        console.log("ERROR: ", error)
        throw error;
    }
})()

*/
