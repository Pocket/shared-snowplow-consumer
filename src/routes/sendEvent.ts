import { Router } from 'express';
import { nanoid } from 'nanoid';
import { eventConsumer } from '../eventConsumer';

const router = Router();

//todo: validate schema
router.post('/', (req, res) => {
  console.log(`received messageBody -> ${JSON.stringify(req.body)}`);
  const requestId = req.body.id ?? nanoid();
  const detailType = req.body['detail-type'];

  if (eventConsumer[detailType] == null) {
    throw new Error(
      `Unable to retrieve handler for detailType='${detailType}'`
    );
  }

  eventConsumer[detailType](req.body);

  return res.send({
    status: 'OK',
    message: `processing event ${JSON.stringify(
      req.body
    )} (requestId='${requestId}')`,
  });
});

export default router;
