import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/Cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import mongoose from "mongoose";
import jwt from "jsonwebtoken";


const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500, "Something Went Wrong While Generating Refresh and Access Tokens!")
    }
}



 const registerUser = asyncHandler( async (req, res) => {
    // Logic Building Start
    // get user details from fontend we use postman for this
    // validation - not empty
    // check if user already exists: check with username and email
    // check for images , check for avatar
    // upload them to cloudinary , check avatar 
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creations 
    // return res
    
    const {username, email, fullname, password} = req.body
    console.log("email: ", email);
    // console.log(req.body)
    // if(fullname === "")
    // {
    //     throw new ApiError(400, "Fullname cannot be empty")
    // }

    if([username, email, fullname, password].some((field) => field?.trim() === "")){
        throw new ApiError(400, "All Field are required!")
    }

   

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if(existedUser){
        throw new ApiError(409, "User With email or username already exists")
    }

    // console.log(req.files);
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar File is required!")
    }

    const avatar =  await uploadOnCloudinary(avatarLocalPath)
    
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    console.log(coverImage);

    if(!avatar){
        throw new ApiError(400, "Avatar is not uploaded successfully!")
    }

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user!")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered Successfully!")
    )
} )

const loginUser = asyncHandler(async (req, res) => {

    // req body -> data
    // username or email 
    // find the users
    // password check
    // access and refresh token 
    // send cookie and res

    const {email, username, password} = req.body

    console.log("email: ", email)
    console.log("password: ", password)

    if(!username && !email){
        throw new ApiError(400, "username or email is required!")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user){
        throw new ApiError(404, "User Does not exist!")
    }
    
    const isPasswordValid = await user.isPasswordCorrect(password)
    
    if (!isPasswordValid) {
        throw new ApiError(401, "Password is not valid!")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedinUser = User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly : true,
        secure : true
    }
    console.log("Logged In successfully!")

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        // "User Logged In Successfully!",
        `User Logged In Successfully! ${user} ${loggedinUser} ${accessToken} ${refreshToken}`
    )

})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly : true,
        secure : true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out Successfully!"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {

    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized request!")
    }
    
    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        
        const user = await User.findById(decodedToken?._id)
        
        if(!user){
            throw new ApiError(401, "Invalid RefreshToken!")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh Token is expired or used!")
        }
    
        const options = {
            httpOnly : true,
            secure : true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options )
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200, 
                {accessToken, newRefreshToken},
                "Access Token Refreshed Successfully!"
            )
        )
    
    } catch (error) {
        throw new ApiError(401, error?.message  || "Invalid RefreshToken!")
    }

})

const changeCurrentPassword = asyncHandler(async (req, res) => {

    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400, "Invalid Password!")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Changed Successfully!"))


})

const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(200, req.user, "Current User Fetched Successfully!")
})

const updateAccountdetails = asyncHandler(async (req, res) => {
    const {fullname, email} = req.body

    if(!fullname || !email){
        throw new ApiError(400, "Fullname and email is required!")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email: email
            }
        },
        {new : true}
    
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account Details Updated Successfully!"))

})
    
const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar File is missing!")
    }
    
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    
    if(!avatar.url){
        throw new ApiError(400, "error while uploading avatar!")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar Updated Successfully!")
    )

})

const updateCoverImage = asyncHandler(async(req, res) => {
    const coverLocalImage = req.file?.path

    if(!coverLocalImage){
        throw new ApiError(400, "CoverImage File is missing!")
    }
    
    const newcoverImage = await uploadOnCloudinary(coverLocalImage)
    
    if(!newcoverImage.url){
        throw new ApiError(400, "error while uploading CoverImage!")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                coverImage: newcoverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "CoverImage Updated Successfully!")
    )

})

const getUserChannelProfile = asyncHandler(async (req, res) => {

    const {username} = req.params

    if(!username?.trim()) {
        throw new ApiError(400, "username is missing!")
    }

    // User.findById({username})
    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond:{
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullname: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed : 1,
                avatar : 1,
                coverImage : 1,
                email: 1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404, "Channel Not Found!")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, channel[0], "Channel Fetched Successfully!"))


})



 export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountdetails,
    updateUserAvatar,
    updateCoverImage,
    getUserChannelProfile
}