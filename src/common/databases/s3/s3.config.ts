import { PutObjectCommand, S3Client, S3ClientConfig } from "@aws-sdk/client-s3";


type S3Config = S3ClientConfig;

export class S3Connection {
  private connection: S3Client;
  private readonly config: S3Config;

  constructor() {
    this.config = {
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    };
  }

  async connect(): Promise<void> {
    this.connection = new S3Client(this.config);
    await this.connection.config.credentials();
  }

  async disconnect(): Promise<void> {
    await this.connection?.destroy();
  }

  getConnection(): S3Client {
    return this.connection;
  }

  getS3Config(): S3Config {
    return this.config;
  }

  async saveUserImage(userImage: Express.Multer.File): Promise<string> {
    const key = `users/${Date.now()}-${userImage.originalname}`;

    await this.connection.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key,
        Body: userImage.buffer,
        ContentType: userImage.mimetype,
      }),
    );

    // 직접 S3 URL 생성
    const imageUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    return imageUrl;
  }
}
