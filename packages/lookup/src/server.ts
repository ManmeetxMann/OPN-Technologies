import App from '../../common/src/express/app'

import * as bodyParser from 'body-parser'
import loggerMiddleware from '../../common/src/middlewares/logger'

import RootController from './controllers/root.controller'
import QuestionnaireController from './controllers/questionnaire.controller'

const PORT = Number(process.env.PORT) || 5004

const app = new App({
  port: PORT,
  validation: true,
  corsOptions: '*',
  controllers: [
    new RootController(),
    new QuestionnaireController(),
  ],
  middleWares: [bodyParser.json(), bodyParser.urlencoded({extended: true}), loggerMiddleware],
})

app.listen()

export const init = (): void => app.initialize()
