GlassLab SDK js (Browser)
=========================

This browser-compatible GlassLab SDK allows games and other applications to connect to the GlassLab Game Services (GLGS) platform and perform certain operations. The primary purpose of integrating this library into your project is to track game sessions and store telemetry for those sessions.

This package includes the glasslab-sdk.js source.

Specific APIs used:
- XMLHttpRequest
- Storage
- Blob

Integration and Configuration
-----------------------------

The GlassLab SDK for Javascript is a global object, accessible as "GlassLabSDK". With the SDK integrated into your project, you can access all of the functions in code or in the browser console. By default, the SDK is configured to send all requests to the container host for ease of access with browser games embedded in Playfully.org.

**Testing in your own Web Server**

To test in your own web server, simply integrate the SDK library into your source and make sure to call the connect() function with the "uri" parameter as "http://developer.playfully.org". Otherwise, the uri will be set to the container host, as mentioned above.

```
Connect to developer.playfully.org with my "TEST" gameId
GlassLabSDK.connect( "TEST", "http://developer.playfully.org" );
```

**Testing in the Playfully Sandbox**

Coming soon!

**Testing Locally**

Local integration of the SDK, which is running content from your local file server (file:///), has limited functionality. While the SDK can't make requests to another domain from file:///, you can still record telemetry events and save them to a file. Note, though, that telemetry saved this way will not be stored on the servers.

To enable local logging, set the necessary option to true:
```
GlassLabSDK.setOptions( { localLogging: true } );
```

You can then retrieve a download link for the telemetry with:
```
GlassLabSDK.generateOutputFile();
```

Note that this function merely generates the link to the telemetry, using the Blob API. It is your responsibility to attach the link to some button in your page.

**App Configuration**

There are several options available to set for your game/app, each of which will be appended to the sessions and telemetry. This is meant to distinguish your data and provides our servers with an easy method to access.
- gameId: provided to you by a GlassLab representative.
- gameVersion: the version of your game/app
- deviceId: denotes unique users on the same device or computer
- gameLevel: denotes a particular section of the game or user experience (optional)

To set any of the above options, emulate the following code:
```
// Format
GlassLabSDK.setOptions( {
	[option1]: [data],
	[option2]: [data]
} );

// Example: set everything but deviceId
GlassLabSDK.setOptions( {
	gameId: "TEST",
	gameVersion: "1.0.0",
	gameLevel: "The Final Battle"
} );
```

**Console Logs**

By default, the SDK will print nothing to the console. To enable/disable this, call the following functions:
```
// Enable console logs
GlassLabSDK.displayLogs();

// Disable console logs
GlassLabSDK.hideLogs();
```

API Format and Examples
-----------------------

The GlassLab SDK exposes many functions that communicate with the server to perform some operation, whether it is managing sessions, recording data, or enrolling a student in a course. The table below details the functions that are exposed, the information required for dispatch, and their purpose.

| SDK Function | Purpose | Internal Calls Made |
| ------------ | ------- | ---------------- |
| connect(gameId, uri) | Attempts to establish a connection with the server. The gameId must be valid. If the uri parameter is null then the container host is used by default. | success: getConfig |
| getConfig(uri) | Called automatically after successful connect(), which could return a uri redirect to be set. The user won't need to call this function directly. | success: startPlaySession |
| deviceUpdate() | Associates the authenticated user with the device Id, which is automatically set as "user_OS_browser". The user won't need to call this function directly. | N/A |
| getAuthStatus() | Checks if the user is already authenticated with the server. | success: getPlayerInfo |
| getPlayerInfo() | Automatically called upon successful login() and getAuthStatus(). Retrieves the current totalTimePlayed for authenticated user. The user won't need to call this function directly. | N/A |
| login(username, password) | Attempts to log the user into the system. | success: getPlayerInfo |
| logout() | Attempts to log the user out of the system. | N/A |
| enroll(courseCode) | Attempts to enroll the authenticated user to a course denoted by a 5-character code. | N/A |
| unenroll(courseId) | Attempts to unenroll the authenticated user from a course denoted by the course Id. This Id can be retrieved from getCourses(). | N/A |
| getCourses() | Retrieves a list of enrolled courses for the current authenticated user. | N/A |
| startPlaySession() | Automatically called at the start of the app session. The user will not need to call this function directly. | N/A |
| startSession() | Attempts to start a new session for gathering telemetry. A session Id will be returned which will be attached to all subsequent telemetry events. | N/A |
| endSession() | Attempts to end the current session. | N/A |
| endSessionAndFlush() | Attempts to end the current session and flushes telemetry afterward. | N/A |
| saveTelemEvent(name, data) | Record a new telemetry event by specifying the name of the event and JSON-formatted data blob. | N/A |
| sendTotalTimePlayed() | Records the updated totalTimePlayed for the authenticated user. This function is called automatically and the user does not need to call it directly. | N/A |
| getAchievements() | Get all available achievements for the game Id. The response will be a JSON-formatted blob with item, group, and subGroup fields for each available achievement. | N/A |
| saveAchievement(item, group, subgroup) | Record a new achievement specifying parameters that match the server configuration. | N/A |
| getSaveGame() | Retrieves the save game blob for the current authenticated user. | N/A |
| postSaveGame(data) | Records a JSON-formatted save game blob for the current authenticated user. | N/A |
| postSaveGameBinary(binary) | Records a binary save game blob for the current authenticated user. | N/A |

The above repsonse messages assume a valid and successful request. If the request was unsuccessful, which could either be due to internet connection state or invalid data, the server will respond with a JSON-formatted string indicating the error.

**On-Demand vs. Queued Requests**

Some requests occur immediately while others are queued. For those requests that are queued, it is not recommended to halt the game while waiting for a response.

It is important to get the response immediately from on-demand requests, because they often inform how you proceed in the game or app. The on-demand requests are:
- connect()
- getConfig()
- deviceUpdate()
- getAuthStatus()
- getPlayerInfo()
- login()
- logout()
- enroll()
- unenroll()
- getCourses()
- startPlaySession()
- getAchievements()
- getSaveGame()

The remaining requests are inserted into a queue to be called later. We do this to avoid overloading the servers with high-frequncy, high-volume http requests. The queue flush is determined by parameters set via getConfig(), which include minimum number of events available, maximum number of events available, and dispatch interval (typically set to 30 seconds). To ensure all data is sent at the end of a game session, you can call endSessionAndFlush() which will automatically flush the queue after ending the session. The queued requests are:
- startSession()
- endSession()
- endSessionAndFlush() (note this flushes the queue anyway)
- saveTelemEvent()
- sendTotalTimePlayed()
- saveAchievement()
- postSaveGame()
- postSaveGameBinary()

Callbacks
---------

Every API request the user can make to the server allows for custom success() and error() callback functions. These are the last two parameters of each function. Both callbacks accept a single "data" parameter, which is a JSON-formatted string indicating the response.

```
// Call connect and check the response
GlassLabSDK.connect( "TEST", "http://developer.playfully.org", function( data ) {
	console.log( "connect was successful: " + data );
}, function( data ) {
	console.log( "connect was unsuccessful: " + data );
});

// Start a session, send sample telemetry, and end the session
// No need to listen for success or error
GlassLabSDK.startSession();
GlassLabSDK.saveTelemEvent( "event1": { int: 1 } );
GlassLabSDK.saveTelemEvent( "event2": { bool: true } );
GlassLabSDK.saveTelemEvent( "event3": { string: "this is a test", float: 1.0 } );
GlassLabSDK.endSessionAndFlush();
```

If you don't specify any callback function, or specifiy null, default callbacks will fire which simply print the information to the console. This information is only printed if the displayLogs option is active.

### License

The GlassLab SDK is under the BSD license: [SDK license](https://github.com/GlasslabGames/GlassLabSDK-js/blob/master/LICENSE "SDK license")