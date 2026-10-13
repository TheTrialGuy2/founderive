import pkg from "../../package.json";

/** The app version filled into feedback. Import it only on the server, so package.json isn't sent to the browser. */
export const APP_VERSION: string = pkg.version;
