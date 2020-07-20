import { Router } from "express";

interface IControllerBase {
    initRoutes(): void
}

export interface IRouteController extends IControllerBase {
    router: Router;
}

export default IControllerBase