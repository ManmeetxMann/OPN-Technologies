
#  [577](https://github.com/OPN-Technologies/services/issues/557) Admin Report PDFs

## Status

Proposed - 2020/10/20

## Context

The Admin app currently allows an admin to see various reporting views. We must build an API to support generating PDFs on demand for each of the views. The PDFs will be generated by the server and sent to the front end app to be shared or downloaded.

**Requirements**
- The admin should have the ability to request a PDF on demand from the iOS and Android apps
- The admin should have the ability to specify the group they would like to generate the PDF for
- The admin should have the ability to specify the location they would like to generate the PDF for
- The admin should have the ability to specify the time range they would like to generate the PDF for
- The admin should have the ability to specify the date range they would like to generate the PDF for
- The report should contain the following data:
    - A list of users with a pending badge
    - A list of users with a proceed badge
    - A list of users with a caution badge
    - A list of users with a stop badge
    - A list of all users who checked in during the given dateTime range
    - A list of all users who checked out during the given dateTime range
- The admin should have the ability to generate a PDF for a per user report
- The per user report should contain all of the same data that is shown on the front ends. This includes:
    - Traces that the user is involved in, either as the exposed or exposing user
    - Time/date of each assessment completed by a user
    - Name of the users parent/guardian if applicable
    - Assessment responses up to the last 30 days
- The PDF should be formatted using tabular HTML

## Decision

To generate the PDF we will use [node-html-pdf](https://github.com/marcbachmann/node-html-pdf). We will use this library to populate a Buffer and transmit it to the client without saving it to a filesystem.

The library accepts html as a string, so we can generate the html using handlebars.

For endpoints, we will use two GET endpoints in the enterprise service: /organizations/{orgId}/stats/report and organizations/{orgId}/stats/user-report. Both endpoints will accept the optional query parameters start and end, which will be ISO Datetime strings. If these are not provided, the default will be end: now, start: the start of the day 30 days ago.

The report endpoint will additionally accept optional parameters locationId and groupId. These will be usable in combination, and neither is required

The user-report endpoint will additionally accept a required query parameter userId and an optional parameter parentUserId. If parentUserId is provided, userId is the dependant id for the user with id parentUserId

## Consequences

The PDFs will be available using node endpoints in the enterprise service. These endpoints will be authenticated so that only real admins can use them

Because the PDFs will be download from app endpoints (not a standard url) the user will not be able to send links to reports. They will have to use the app to download the file and use it as they see fit once it's on their phone.