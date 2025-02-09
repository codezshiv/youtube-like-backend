import mongoose, { modelNames, Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
    {
        videoFile: {
            type: String, // cloudniary url
            required: true
        },
        thumbnail: {
            type: String, // cloudniary url
            required: true
        },
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        duration: {
            type: Number, // cloudniary url
            required: true
        },
        views: {
            type: Number,
            default: 0
        },
        isPublished: {
            type: Boolean,
            default: true
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User"
        },

    },
    {
        timestamps: true
    }
);



videoSchema.plugin(mongooseAggregatePaginatef)

export const Video = mongoose.model("Video", videoSchema);