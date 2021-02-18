import * as express from 'express'
import exphbs from 'express-handlebars'
import path from 'path'

import {app} from './app'

//Attach handlebar only for Reservation Server
app.app.engine('handlebars', exphbs())
app.app.set('view engine', 'handlebars')
app.app.set('views', path.join(__dirname, 'views'))
app.app.use('/static', express.static(path.join(__dirname, 'static')))

app.listen()

export const init = (): void => app.initialize()
