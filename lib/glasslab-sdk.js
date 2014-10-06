/*

Copyright (c) 2014, GlassLab, Inc.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer. 
2. Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

The views and conclusions contained in the software and documentation are those
of the authors and should not be interpreted as representing official policies, 
either expressed or implied, of the FreeBSD Project.

*/


/*

User Stories...

1) As a developer with a browser game, I want to establish a connection with
Playfully.org by calling connect(). I also expect to see the results of this
request in JSON format.

2) As a developer with a browser game, I want to create a session, send some
telemetry events, and close the session. I want to see the results of each
request, but not necessarily right away.

3) As a developer with a browser game, I want to login using the Playfully.org
login webview and receive a notification when the webview is successful and has
completed its operation.

*/


(function() {

  /*
   * Default SDK constructor.
   */
  function _GlassLabSDK() {
    // HTTP request object for server communication
    this._httpRequest = null;

    // SDK options
    this._options = this._getDefaultOptions();

    // Simple logging
    this._displayLogs = this._getDisplayLogsStore();

    // Queue for non-on-demand messages
    this._dispatchQueue = [];
    setInterval( _dispatchNextRequest, this._options.dispatchQueueUpdateInterval );

    // Active gameSessionId
    this._activeGameSessionId = "";
  }

  _GlassLabSDK.prototype.getOptions = function() {
    return this._options;
  };

  _GlassLabSDK.prototype.setOptions = function( options ) {
    if( isObject( options ) ) {
      if( options.hasOwnProperty( 'uri' ) ) {
        this._options.uri = options.uri;
      }

      if( options.hasOwnProperty( 'gameId' ) ) {
        this._options.gameId = options.gameId;
      }

      if( options.hasOwnProperty( 'gameVersion' ) ) {
        this._options.gameVersion = options.gameVersion;
      }

      if( options.hasOwnProperty( 'deviceId' ) ) {
        this._options.deviceId = options.deviceId;
      }

      if( options.hasOwnProperty( 'gameLevel' ) ) {
        this._options.gameLevel = options.gameLevel;
      }

      if( options.hasOwnProperty( 'dispatchQueueUpdateInterval' ) ) {
        this._options.dispatchQueueUpdateInterval = options.dispatchQueueUpdateInterval;
      }
    }
  };

  _GlassLabSDK.prototype._getDefaultOptions = function() {
    return {
      uri:          window.location.protocol + "//" + window.location.host,
      gameId:       "TEST",
      gameVersion:  "VERSION_NOT_SET", 
      deviceId:     "DEVICE_NOT_SET",
      gameLevel:    "TEST",

      dispatchQueueUpdateInterval: 10000 // milliseconds
    };
  };


  function _dispatchNextRequest() {
    // If the queue is empty, ignore
    if( GlassLabSDK._dispatchQueue.length == 0 ){
      return;
    }

    // Get the dispatch
    var dispatch = GlassLabSDK._dispatchQueue[ 0 ];

    // Need to operate on gameSessionId for endSession and saveTelemEvent APIs
    if( dispatch.apiKey == "endSession" || dispatch.apiKey == "saveTelemEvent" ) {
      // If the gameSessionId doesn't exist, exit the dispatch queue
      // We'll come back to the queue another time when the value exists
      if( GlassLabSDK._activeGameSessionId == "" ) {
        return;
      }
      // The gameSessionId does exist, so we need to replace all instances of
      // "$gameSessionId$" with this new value
      else {
        dispatch.data.gameSessionId = GlassLabSDK._activeGameSessionId;
      }
    }

    // Perform the request
    GlassLabSDK.request( GlassLabSDK._dispatchQueue.shift() );

    // Dispatch the next
    _dispatchNextRequest();
  }


  _GlassLabSDK.prototype.connect = function( gameId, success, error ) {
    // Set the game Id
    this.setOptions( { gameId: gameId } );

    // Perform the request
    this.request({
        method: "GET",
        apiKey: "connect",
        api: "/sdk/connect",
        contentType: "application/x-www-form-urlencoded",
        success: function( responseData ) {
          success( responseData );
        },
        error: function( responseData ) {
          error( responseData );
        }
      });
  };

  _GlassLabSDK.prototype.startSession = function( success, error ) {
    // Add the request to the queue
    this._dispatchQueue.push({
        method: "POST",
        apiKey: "startSession",
        api: "/api/v2/data/session/start",
        contentType: "application/json",
        data:
        {
          gameId: this._options.gameId,
          deviceId: this._options.deviceId,
          gameLevel: this._options.gameLevel,
          timestamp: +new Date()
        },
        success: function( responseData ) {
          GlassLabSDK._activeGameSessionId = JSON.parse( responseData ).gameSessionId;
          success( responseData );
        },
        error: function( responseData ) {
          error( responseData );
        }
      });
  };

  _GlassLabSDK.prototype.endSession = function( success, error ) {
    // Add the request to the queue
    this._dispatchQueue.push({
        method: "POST",
        apiKey: "endSession",
        api: "/api/v2/data/session/end",
        contentType: "application/json",
        data:
        {
          gameSessionId: "$gameSessionId$",
          timestamp: +new Date()
        },
        success: function( responseData ) {
          success( responseData );
        },
        error: function( responseData ) {
          error( responseData );
        }
      });
  };

  _GlassLabSDK.prototype.saveTelemEvent = function( name, data, success, error ) {
    // Add the request to the queue
    this._dispatchQueue.push({
        method: "POST",
        apiKey: "saveTelemEvent",
        api: "/api/v2/data/events",
        contentType: "application/json",
        data:
        {
          clientTimeStamp: +new Date(),
          gameId: this._options.gameId,
          gameVersion: this._options.gameVersion,
          deviceId: this._options.deviceId,
          gameLevel: this._options.gameLevel,
          gameSessionId: "$gameSessionId$",
          gameSessionEventOrder: 1, //TODO
          totalTimePlayed: 1, //TODO
          eventName: name,
          eventData: data
        },
        success: function( responseData ) {
          success( responseData );
        },
        error: function( responseData ) {
          error( responseData );
        }
      });
  };


  _GlassLabSDK.prototype.request = function( params ) {
    // Display logs if enabled
    if( this._displayLogs ) {
      console.log( "GlassLabSDK request - params: ", params );
    }

    // Create the XML http request for the SDK call
    this._httpRequest = new XMLHttpRequest();

    /*
     * Set the object parameters and open the request
     * params example: { method: "GET", api: "/api/v2/data/events", contentType: "application/json", data: {} }
     * Last parameter in the open function is async: true (asynchronous) or false (synchronous)
     */
    //this._httpRequest.apiKey = params.key;
    this._httpRequest.success = params.success;
    this._httpRequest.error = params.error;
    this._httpRequest.open( params.method, params.api, true );
    this._httpRequest.setRequestHeader( "Content-type", params.contentType );
    //this._httpRequest.setRequestHeader( "Game-Secret", "646b502aa4fdedc06d36b7eb5a0c1e24552e241405ea9d63b20a4bbfa2bccb3c" );

    /*
     * Set the request callback: holds the status of the XMLHttpRequest (changes from 0 to 4)
     * 0: request not initialized 
     * 1: server connection established
     * 2: request received 
     * 3: processing request 
     * 4: request finished and response is ready (SDK response occurs)
     */
    var _this = this;
    this._httpRequest.onreadystatechange = function() {
      _this.response( this );
    };

    // Make the request
    this._httpRequest.send( JSON.stringify( params.data ) );
  }

  _GlassLabSDK.prototype.response = function( httpRequest ) {
    // Check for completed requests
    if( httpRequest.readyState === 4 ) {

      // Display logs if enabled
      if( this._displayLogs ) {
        console.log( "GlassLabSDK response - apiKey: ", httpRequest.apiKey, ", responseText: ", httpRequest.responseText );
      }

      // OK status, send the success callback
      if( httpRequest.status === 200 || httpRequest.status === 304 ) {
        // Flash return
        //document.getElementsByName( "flashObj" )[0].success( httpRequest.apiKey, httpRequest.responseText );
        httpRequest.success( httpRequest.responseText );
      }
      // All other status codes will return a failure callback
      else {
        // Flash return
        //document.getElementsByName( "flashObj" )[0].failure( httpRequest.apiKey, httpRequest.responseText );
        httpRequest.error( httpRequest.responseText );
      }
    }
  }


  _GlassLabSDK.prototype.displayLogs = function() {
    this._displayLogs = true;
    this._updateDisplayLogsStore();
  };

  _GlassLabSDK.prototype.hideLogs = function() {
    this._displayLogs = false;
    this._updateDisplayLogsStore();
  };

  _GlassLabSDK.prototype._updateDisplayLogsStore = function() {
    if( typeof( Storage ) !== "undefined" ) {
      localStorage.setItem( "displayLogs", this._displayLogs ? 1 : 0);
    }
  };

  _GlassLabSDK.prototype._getDisplayLogsStore = function() {
    var display = false;
    if( typeof( Storage ) !== "undefined" ) {
      if( localStorage.getItem("displayLogs" ) ) {
        display = parseInt( localStorage.getItem("displayLogs" ) );
        if( isNaN( display ) ) {
          display = false;
        }
      }
    }

    return display;
  };


  function isObject(obj) {
    return ( Object.prototype.toString.call( obj )  === '[object Object]' );
  }

  // Make the SDK global
  window.GlassLabSDK = new _GlassLabSDK();
})();






























