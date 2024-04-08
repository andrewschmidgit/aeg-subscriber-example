import { HTTP } from "cloudevents";
import express from 'express';
import { validate } from "./validate";
import { EventGridDeserializer, SubscriptionValidationEventData, EventGridEvent } from '@azure/eventgrid';
import 'dotenv/config';

const port = process.env.PORT ?? 8080;
const client_id = process.env.CLIENT_ID;
const tenant_id = process.env.TENANT_ID;

if (!client_id || !tenant_id) throw 'must set CLIENT_ID and TENANT_ID'

const app = express();

app.use(express.json());

// Abuse protection (CloudEvents 1.0)
// https://learn.microsoft.com/en-us/azure/event-grid/cloudevents-schema#endpoint-validation-with-cloudevents-v10
// This gets called at the time you create the event subscription in Azure.
// It must set the 'Webhook-Allowed-Origin' header
app.options('/event', async ({ headers }, res) => {
    const webhook_origin = headers['webhook-request-origin'];
    const authorization = headers['authorization'];

    if (!webhook_origin) {
        return new Response(null, { status: 400 });
    }

    if (!authorization) {
        return new Response(null, { status: 403 });
    }

    // Skips 'Bearer ' in 'Bearer x83hbi3...'
    const token = authorization.slice(7);

    await validate(token, { client_id, tenant_id });

    // TODO: You should save the webhook_origin in a data store
    // to validate actual events

    res.set('Webhook-Allowed-Origin', webhook_origin);
    res.status(204);
    res.end();
});

// Subscription Validation (Event Grid Schema)
app.post('/event-azure', async ({ headers, body }, res) => {
    const event_type = headers['aeg-event-type'];
    const authorization = headers.authorization;
    const token = authorization?.slice(7);

    if (!token) {
        return new Response(null, { status: 403 });
    }

    await validate(token, { client_id, tenant_id });

    if (!event_type) {
        console.log('no event_type given');
        return new Response(null, { status: 400 });
    }

    const deserializer = new EventGridDeserializer();

    if (event_type === 'SubscriptionValidation') {
        const events = await deserializer.deserializeEventGridEvents(body) as EventGridEvent<SubscriptionValidationEventData>[];
        if (events.length !== 1) {
            console.log('got 0 or 2+ events');
            console.log(events);
            return new Response(null, { status: 400 });
        }

        const validationCode = events[0].data.validationCode;

        return res.json({ validationResponse: validationCode }).status(200);
    }

    return new Response(null, { status: 204 });
});

app.listen(port, () => {
    console.log(`app is running at http://localhost:${port}`);
});
