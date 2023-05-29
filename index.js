const sharp = require('sharp');
import { ErrorRequestHandler } from 'express';
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client();  //  여기 js 페이지가 람다에서 실행될 것인데  람다에서 S3Client의 빈곳에 access_key 랑 secret_access_key를  알아서 넣어 준다 . 



exports.handler = async (event, context, callback) => {
    const Bucket = event.Record[0].s3.bucket.name;
    const Key = decodeURIComponent(event.Record[0].s3.object.key);
    const filename = Key.split('/').at(-1); //파일 이름
    const ext = Key.split('.').at(-1).toLowerCase(); // 확장자 
    const requiredFormat = ext === 'jpg' ? 'jpeg' : ext; // sharp 에는 확장자가 jpg면 jpeg를 사용해야 한다 . 나머지는 그냥 써도 상관 없다.
    console.log('name', filename, 'ext', ext);

    try {
        const getObject = await s3.send(new GetObjectCommand({ Bucket: Key }));
        const buffers = [];
        for await (const data of getObject.Body) {
            buffers.push(data);
        }
        const imageBuffer = Buffer.concat(buffers);
        console.log('put', imageBuffer.length);
        const resizedImage = await sharp(buffers)
            .resize(200, 200, { fit: 'inside' })  //200 * 200 사이즈안에서 최대한 크기 꽉 맞춰서 리사이징을 한다 . 
            .toFormat(requiredFormat)
            .toBuffer();
        await s3.send(new PutObjectCommand({  //다시 s3 에 저장 하는것 입니다       
            Bucket,
            Key: `thumb/${filename}`, // thumb/고양이.png
            Body: resizedImage,
        }))
        console.log('put', resizedImage.length);
        return callback(null, `thumb/${filename}`);
    } catch (error) {
        console.error(error);
        return callback(error);
    }
}