import { Router } from 'express';
import { nanoid } from 'nanoid';
import { eventConsumer } from '../eventConsumer';

const router = Router();

router.post(
  '/',
  (req, res) => {

      const requestId = req.body.traceId ?? nanoid();
      const source = req.body.source;

      if (eventConsumer[source] == null) {
        throw new Error(
          `Unable to retrieve handler for source='${source}'`
        );
      }
      eventConsumer[source](req.body);
      return res.send({
        status: 'OK',
        message: `processing event ${JSON.stringify(
          req.body
        )} (requestId='${requestId}')`,
      });
    }
);

export default router;
