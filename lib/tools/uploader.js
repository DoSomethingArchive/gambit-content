'use strict';

const S3 = require('aws-sdk/clients/s3');
const s3Stream = require('s3-upload-stream');

/**
 * The S3Uploader class.
 */
class S3Uploader {
  /**
   * Create a new S3Uploader
   *
   * @param  {Object} opts Default options for the AWS S3 service
   */
  constructor(opts) {
    this.client = new S3(opts);
    this.uploadStream = s3Stream(this.client);
  }

  /**
   * Returns an AWS S3 multipart stream. I recevies data piped by another stream.
   * Good Read on limits of the S3 multipart API: https://github.com/nathanpeck/s3-upload-stream
   *
   * @param  {type} key description
   * @return {type}     description
   */
  getUploadStream(key) {
    return this.uploadStream.upload({ Key: key });
  }
}

module.exports = S3Uploader;
