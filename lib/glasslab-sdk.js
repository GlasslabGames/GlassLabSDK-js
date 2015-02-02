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

    // Output file and text for local telemetry logging
    this._outputFile = null;
    // Output html for live logging via separate window
    this._telemetryOutputTab = null;
    this._outputText = this._getTelemetryOutputStore();

    // Queue for non-on-demand messages
    this._dispatchQueue = [];
    setInterval( _dispatchNextRequest, this._options.dispatchQueueUpdateInterval );

    // The following variables will undergo change as functions are performed with the SDK
    this._activeGameSessionId = "";
    this._activePlaySessionId = "";
    this._gameSessionEventOrder = 1;
    this._playSessionEventOrder = 1;
    this._totalTimePlayed = 0;

    // Update function for sending totalTimePlayed at certain intervals
    // Is only activated when getPlayerInfo is successful
    // Deactivated on logout
    this._isAuthenticated = false;
    setInterval( _sendTotalTimePlayed, this._options.sendTotalTimePlayedInterval );

    // Update function for polling matches at certain intervals
    this._matches = {};
    setInterval( _pollMatches, this._options.pollMatchesInterval );
  }

  _GlassLabSDK.prototype.getOptions = function() {
    return this._options;
  };

  _GlassLabSDK.prototype.setOptions = function( options ) {
    if( isObject( options ) ) {
      if( options.hasOwnProperty( 'sdkVersion' ) ) {
        this._options.sdkVersion = options.sdkVersion;
      }

      if( options.hasOwnProperty( 'uri' ) ) {
        this._options.uri = options.uri;
      }

      if( options.hasOwnProperty( 'gameId' ) ) {
        this._options.gameId = options.gameId;
      }

      if( options.hasOwnProperty( 'gameVersion' ) ) {
        this._options.gameVersion = options.gameVersion;
      }

      if( options.hasOwnProperty( 'gameSecret' ) ) {
        this._options.gameSecret = options.gameSecret;
      }

      if( options.hasOwnProperty( 'deviceId' ) ) {
        this._options.deviceId = options.deviceId;
      }

      if( options.hasOwnProperty( 'gameLevel' ) ) {
        this._options.gameLevel = options.gameLevel;
      }

      if( options.hasOwnProperty( 'dispatchQueueUpdateInterval' ) ) {
        this._options.dispatchQueueUpdateInterval = options.dispatchQueueUpdateInterval;
        setInterval( _dispatchNextRequest, this._options.dispatchQueueUpdateInterval );
      }

      if( options.hasOwnProperty( 'sendTotalTimePlayedInterval' ) ) {
        this._options.sendTotalTimePlayedInterval = options.sendTotalTimePlayedInterval;
        setInterval( _sendTotalTimePlayed, this._options.sendTotalTimePlayedInterval );
      }

      if( options.hasOwnProperty( 'pollMatchesInterval' ) ) {
        this._options.pollMatchesInterval = options.pollMatchesInterval;
        setInterval( _pollMatches, this._options.pollMatchesInterval );
      }

      if( options.hasOwnProperty( 'eventsDetailLevel' ) ) {
        this._options.eventsDetailLevel = options.eventsDetailLevel;
      }

      if( options.hasOwnProperty( 'eventsPeriodSecs' ) ) {
        this._options.eventsPeriodSecs = options.eventsPeriodSecs;
      }

      if( options.hasOwnProperty( 'eventsMinSize' ) ) {
        this._options.eventsMinSize = options.eventsMinSize;
      }

      if( options.hasOwnProperty( 'eventsMaxSize' ) ) {
        this._options.eventsMaxSize = options.eventsMaxSize;
      }

      if( options.hasOwnProperty( 'localLogging' ) ) {
        this._options.localLogging = options.localLogging;
      }
    }
  };

  _GlassLabSDK.prototype._getDefaultOptions = function() {
    return {
      sdkVersion:   "0.3.2", 

      uri:          window.location.protocol + "//" + window.location.host,
      gameId:       "TEST",
      gameVersion:  "VERSION_NOT_SET",
      gameSecret:   "SECRET_NOT_SET",
      deviceId:     generateDeviceId( "null" ),
      gameLevel:    "LEVEL_NOT_SET",

      dispatchQueueUpdateInterval: 10000, // milliseconds
      sendTotalTimePlayedInterval: 5000,  // milliseconds
      pollMatchesInterval: 10000,         // milliseconds

      eventsDetailLevel: 10,
      eventsPeriodSecs: 30000,
      eventsMinSize: 5,
      eventsMaxSize: 100,

      localLogging: false
    };
  };


  function _pushToDispatchQueue( dispatchObject ) {
    // Status:
    // - ready (can be dispatched)
    // - pending (already dispatched, no response)
    // - failed (dispatch failed)
    // - success (dispatch successful)
    GlassLabSDK._dispatchQueue.push( dispatchObject );// { dispatch: dispatchObject, status: "ready" } );
  }

  function _dispatchNextRequest( status ) {
    // If the queue is empty, ignore
    if( GlassLabSDK._dispatchQueue.length == 0 ) {
      return;
    }

    /*// If the current request is pending, ignore
    if( GlassLabSDK._dispatchQueue[ 0 ].status == "pending" ) {
      return;
    }

    // If the current request is successful, remove it
    if( status && status == "success" ) {
      GlassLabSDK._dispatchQueue.shift();
    }*/

    // Get the next dispatch
    var dispatch = GlassLabSDK._dispatchQueue[ 0 ];//.dispatch;

    // Need to operate on gameSessionId for endSession and saveTelemEvent APIs
    if( !GlassLabSDK._options.localLogging ) {
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
          dispatch.data.playSessionId = GlassLabSDK._activePlaySessionId;
        }
      }
    }

    // Perform the request
    GlassLabSDK.request( GlassLabSDK._dispatchQueue.shift() );
  }

  function _sendTotalTimePlayed() {
    // Only proceed if we're authenticated. We don't want to send requests we
    // know will return invalid.
    if( !GlassLabSDK._isAuthenticated ) {
      return;
    }

    // Update the new totalTimePlayed
    GlassLabSDK._totalTimePlayed += GlassLabSDK._options.sendTotalTimePlayedInterval;

    // Perform the sendTotalTimePlayed request
    GlassLabSDK.sendTotalTimePlayed(
      function( responseData ) {
        // The request was successful
        if( this._displayLogs ) {
          console.log( "Server received new totalTimePlayed: " + responseData );
        }
      },
      function( responseData ) {
        // The request failed
        if( this._displayLogs ) {
          console.log( "[REQUEST FAILED]: sendTotalTimePlayed, " + responseData );
        }
      });
  }

  function _pollMatches() {
    // Only proceed if we're authenticated. We don't want to send requests we
    // know will return invalid.
    if( !GlassLabSDK._isAuthenticated ) {
      return;
    }

    // Perform the pollMatches request
    GlassLabSDK.pollMatches(
      function( responseData ) {
        // Set the matches
        GlassLabSDK._matches = JSON.parse( responseData );

        /*
         * Match format:
         * {
         *    players: [],
         *    status: "active|closed",
         *    turns: [],
         *    meta: {}
         * }
         */

        // The request was successful
        if( this._displayLogs ) {
          console.log( "Received match data from the server, " + responseData );
        }
      },
      function( responseData ) {
        // The request failed
        if( this._displayLogs ) {
          console.log( "[REQUEST FAILED]: pollMatches, " + responseData );
        }
      });
  }


  _GlassLabSDK.prototype.connect = function( gameId, uri, success, error ) {
    // Set the game Id
    this.setOptions( { gameId: gameId } );

    // Set the URI if it is valid
    if( uri ) {
      this.setOptions( { uri: uri } );
    }

    // Perform the request
    this.request({
        method: "GET",
        apiKey: "connect",
        api: "/sdk/connect",
        contentType: "application/x-www-form-urlencoded",
        success: function( responseData ) {
          GlassLabSDK.getConfig( responseData, success, error )
        },
        error: function( responseData ) {
          defaultErrorCallback( error, responseData );
        }
      });
  };

  _GlassLabSDK.prototype.getConfig = function( uri, success, error ) {
    // Set the URI
    this.setOptions( { uri: uri } );

    // Perform the request
    this.request({
        method: "GET",
        apiKey: "getConfig",
        api: "/api/v2/data/config/" + this._options.gameId,
        contentType: "application/x-www-form-urlencoded",
        success: function( responseData ) {
          // Parse the throttle parameters
          var throttleOptions = JSON.parse( responseData );
          GlassLabSDK.setOptions({
              eventsDetailLevel: throttleOptions.eventsDetailLevel,
              eventsPeriodSecs: throttleOptions.eventsPeriodSecs,
              eventsMinSize: throttleOptions.eventsMinSize,
              eventsMaxSize: throttleOptions.eventsMaxSize
          });

          // Call the user's success callback
          defaultSuccessCallback( success, responseData );

          // Start the play session only if we haven't already
          if( GlassLabSDK._activePlaySessionId == "" ) {
            GlassLabSDK.startPlaySession();
          }

          // Check to see if we're already authenticated
          GlassLabSDK.getAuthStatus();
        },
        error: function( responseData ) {
          defaultErrorCallback( error, responseData );
        }
      });
  };

  _GlassLabSDK.prototype.deviceUpdate = function( success, error ) {
    // Perform the request
    this.request({
        method: "POST",
        apiKey: "deviceUpdate",
        api: "/api/v2/data/game/device",
        contentType: "application/x-www-form-urlencoded",
        data:
        {
          deviceId: this._options.deviceId,
          gameId: this._options.gameId
        },
        success: function( responseData ) {
          defaultSuccessCallback( success, responseData );
        },
        error: function( responseData ) {
          defaultErrorCallback( error, responseData );
        }
      });
  };

  _GlassLabSDK.prototype.getAuthStatus = function( success, error ) {
    // Perform the request
    this.request({
        method: "GET",
        apiKey: "getAuthStatus",
        api: "/api/v2/auth/login/status",
        contentType: "application/x-www-form-urlencoded",
        success: function( responseData ) {
          // Get the status and check for success/fail
          var status = JSON.parse( responseData ).status;
          if( status == "ok" ) {
            // Get player info if we haven't already
            if( !GlassLabSDK._isAuthenticated ) {
              GlassLabSDK.getPlayerInfo();
            }
          }

          // Call the user's success callback
          defaultSuccessCallback( success, responseData );
        },
        error: function( responseData ) {
          // Make sure the totalTimePlayedUpdate is deactivated
          GlassLabSDK._isAuthenticated = false;

          // Call the user's failure callback
          defaultErrorCallback( error, responseData );
        }
      });
  };

  _GlassLabSDK.prototype.getPlayerInfo = function( success, error ) {
    // Perform the request
    this.request({
        method: "GET",
        apiKey: "getPlayerInfo",
        api: "/api/v2/data/game/" + this._options.gameId + "/playInfo",
        contentType: "application/json",
        success: function( responseData ) {
          // Retrieve the total time played for this user
          GlassLabSDK._totalTimePlayed = JSON.parse( responseData ).totalTimePlayed;

          // Indicate we are authenticated
          GlassLabSDK._isAuthenticated = true;

          // Call the user's success callback
          defaultSuccessCallback( success, responseData );
        },
        error: function( responseData ) {
          // Reset the total time played
          GlassLabSDK._totalTimePlayed = 0;

          // We are not authenticated
          GlassLabSDK._isAuthenticated = false;

          // Call the user's failure callback
          defaultErrorCallback( error, responseData );
        }
      });
  };

  _GlassLabSDK.prototype.getUserInfo = function( success, error ) {
    // Perform the request
    this.request({
        method: "GET",
        apiKey: "getUserInfo",
        api: "/api/v2/auth/user/profile",
        contentType: "application/x-www-form-urlencoded",
        success: function( responseData ) {
          // Call the user's success callback
          defaultSuccessCallback( success, responseData );
        },
        error: function( responseData ) {
          // Call the user's failure callback
          defaultErrorCallback( error, responseData );
        }
      });
  };

  _GlassLabSDK.prototype.login = function( username, password, success, error ) {
    // Add the request to the queue
    this.request({
        method: "POST",
        apiKey: "login",
        api: "/api/v2/auth/login/glasslab",
        contentType: "application/json",
        data:
        {
          username: username,
          password: password
        },
        success: function( responseData ) {
          // Get player info if we haven't already
          if( !GlassLabSDK._isAuthenticated ) {
            GlassLabSDK.getPlayerInfo();
          }

          defaultSuccessCallback( success, responseData );
        },
        error: function( responseData ) {
          defaultErrorCallback( error, responseData );
        }
      });
  };

  _GlassLabSDK.prototype.logout = function( success, error ) {
    // Add the request to the queue
    this.request({
        method: "POST",
        apiKey: "logout",
        api: "/api/v2/auth/logout",
        contentType: "application/x-www-form-urlencoded",
        success: function( responseData ) {
          // TODO

          // Deactivate the totalTimePlayedUpdate
          GlassLabSDK._isAuthenticated = false;

          defaultSuccessCallback( success, responseData );
        },
        error: function( responseData ) {
          defaultErrorCallback( error, responseData );
        }
      });
  };

  _GlassLabSDK.prototype.enroll = function( courseCode, success, error ) {
    // Add the request to the queue
    this.request({
        method: "POST",
        apiKey: "enroll",
        api: "/api/v2/lms/course/enroll",
        contentType: "application/x-www-form-urlencoded",
        data: { courseCode: courseCode },
        success: function( responseData ) {
          // TODO
          
          defaultSuccessCallback( success, responseData );
        },
        error: function( responseData ) {
          defaultErrorCallback( error, responseData );
        }
      });
  };

  _GlassLabSDK.prototype.unenroll = function( courseId, success, error ) {
    // Add the request to the queue
    this.request({
        method: "POST",
        apiKey: "unenroll",
        api: "/api/v2/lms/course/unenroll",
        contentType: "application/x-www-form-urlencoded",
        data: { courseId: courseId },
        success: function( responseData ) {
          // TODO
          
          defaultSuccessCallback( success, responseData );
        },
        error: function( responseData ) {
          defaultErrorCallback( error, responseData );
        }
      });
  };

  _GlassLabSDK.prototype.getCourses = function( success, error ) {
    // Perform the request
    this.request({
        method: "GET",
        apiKey: "getCourses",
        api: "/api/v2/lms/courses",
        contentType: "application/x-www-form-urlencoded",
        success: function( responseData ) {
          // TODO

          // Call the user's success callback
          defaultSuccessCallback( success, responseData );
        },
        error: function( responseData ) {
          defaultErrorCallback( error, responseData );
        }
      });
  };

  _GlassLabSDK.prototype.startPlaySession = function() {
    // Perform the request
    this.request({
        method: "GET",
        apiKey: "startPlaySession",
        api: "/api/v2/data/playSession/start",
        contentType: "application/x-www-form-urlencoded",
        success: function( responseData ) {
          GlassLabSDK._activePlaySessionId = JSON.parse( responseData ).playSessionId;
          GlassLabSDK._playSessionEventOrder = 1;
        },
        error: function( responseData ) {
          console.log( "There was an error calling /api/v2/data/playSession/start: " + responseData );
        }
      });
  };

  _GlassLabSDK.prototype.startSession = function( success, error ) {
    // Reset the gameSessionEventOrder
    this._gameSessionEventOrder = 1;

    // Add the request to the queue
    _pushToDispatchQueue({
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
          defaultSuccessCallback( success, responseData );

          // Send the next item in the message queue
          _dispatchNextRequest();
        },
        error: function( responseData ) {
          defaultErrorCallback( error, responseData );
        }
      });

    // Add the Game_start_unit_of_analysis telemetry event
    this.saveTelemEvent( "Game_start_unit_of_analysis", {} );
  };

  _GlassLabSDK.prototype.endSession = function( success, error ) {
    // Add the Game_end_unit_of_analysis telemetry event
    this.saveTelemEvent( "Game_end_unit_of_analysis", {} );

    // Add the request to the queue
    _pushToDispatchQueue({
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
          // Reset the gameSessionId
          GlassLabSDK._activeGameSessionId = "";

          // Call the user's success callback
          defaultSuccessCallback( success, responseData );

          // Send the next item in the message queue
          _dispatchNextRequest();
        },
        error: function( responseData ) {
          defaultErrorCallback( error, responseData );
        }
      });
  };

  _GlassLabSDK.prototype.endSessionAndFlush = function( success, error ) {
    // Add the Game_end_unit_of_analysis telemetry event
    this.saveTelemEvent( "Game_end_unit_of_analysis", {} );

    // Add the request to the queue
    _pushToDispatchQueue({
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
          // Reset the gameSessionId
          GlassLabSDK._activeGameSessionId = "";

          // Call the user's success callback
          defaultSuccessCallback( success, responseData );

          // Send the next item in the message queue
          _dispatchNextRequest();
        },
        error: function( responseData ) {
          defaultErrorCallback( error, responseData );
        }
      });

    // Flush the queue
    _dispatchNextRequest();
  };

  _GlassLabSDK.prototype.saveTelemEvent = function( name, data, success, error ) {
    // Add the request to the queue
    _pushToDispatchQueue({
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
          playSessionId: "$playSessionId$",
          gameSessionEventOrder: this._gameSessionEventOrder++,
          playSessionEventOrder: this._playSessionEventOrder++,
          totalTimePlayed: this._totalTimePlayed,
          eventName: name,
          eventData: data
        },
        success: function( responseData ) {
          defaultSuccessCallback( success, responseData );

          // Send the next item in the message queue
          _dispatchNextRequest();
        },
        error: function( responseData ) {
          defaultErrorCallback( error, responseData );
        }
      });
  };

  _GlassLabSDK.prototype.sendTotalTimePlayed = function( success, error ) {
    // Perform the request
    _pushToDispatchQueue({
        method: "POST",
        apiKey: "sendTotalTimePlayed",
        api: "/api/v2/data/game/" + this._options.gameId + "/totalTimePlayed",
        contentType: "application/json",
        data: { setTime: this._totalTimePlayed },
        success: function( responseData ) {
          defaultSuccessCallback( success, responseData );

          // Send the next item in the message queue
          _dispatchNextRequest();
        },
        error: function( responseData ) {
          defaultErrorCallback( error, responseData );
        }
      });
  };

  _GlassLabSDK.prototype.getAchievements = function( success, error ) {
    // Perform the request
    this.request({
        method: "GET",
        apiKey: "getAchievements",
        api: "/api/v2/dash/game/" + this._options.gameId + "/achievements/all",
        contentType: "application/x-www-form-urlencoded",
        success: function( responseData ) {
          defaultSuccessCallback( success, responseData );
        },
        error: function( responseData ) {
          defaultErrorCallback( error, responseData );
        }
      });
  };

  _GlassLabSDK.prototype.saveAchievement = function( item, group, subGroup, success, error ) {
    // Save this achievement as a telemetry event also
    this.saveTelemEvent( "Achievement", { item: item, group: group, subGroup: subGroup }, function( responseData ) {}, function( responseData ) {} );

    // Perform the request
    _pushToDispatchQueue({
        method: "POST",
        apiKey: "saveAchievement",
        api: "/api/v2/data/game/" + this._options.gameId + "/achievement",
        contentType: "application/json",
        data: { item: item, group: group, subGroup: subGroup },
        success: function( responseData ) {
          defaultSuccessCallback( success, responseData );

          // Send the next item in the message queue
          _dispatchNextRequest();
        },
        error: function( responseData ) {
          defaultErrorCallback( error, responseData );
        }
      });
  };

  _GlassLabSDK.prototype.getSaveGame = function( success, error ) {
    // Perform the request
    this.request({
        method: "GET",
        apiKey: "getSaveGame",
        api: "/api/v2/data/game/" + this._options.gameId,
        contentType: "application/x-www-form-urlencoded",
        success: function( responseData ) {
          // Call the user's success callback
          defaultSuccessCallback( success, responseData );
        },
        error: function( responseData ) {
          defaultErrorCallback( error, responseData );
        }
      });
  };

  _GlassLabSDK.prototype.postSaveGame = function( data, success, error ) {
    // Perform the request
    _pushToDispatchQueue({
        method: "POST",
        apiKey: "postSaveGame",
        api: "/api/v2/data/game/" + this._options.gameId,
        contentType: "application/json",
        data: data,
        success: function( responseData ) {
          // Call the user's success callback
          defaultSuccessCallback( success, responseData );

          // Send the next item in the message queue
          _dispatchNextRequest();
        },
        error: function( responseData ) {
          defaultErrorCallback( error, responseData );
        }
      });
  };

  _GlassLabSDK.prototype.postSaveGameBinary = function( binary, success, error ) {
    // Perform the request
    _pushToDispatchQueue({
        method: "POST",
        apiKey: "postSaveGame",
        api: "/api/v2/data/game/" + this._options.gameId,
        contentType: "application/json",
        data: data,
        success: function( responseData ) {
          // Call the user's success callback
          defaultSuccessCallback( success, responseData );

          // Send the next item in the message queue
          _dispatchNextRequest();
        },
        error: function( responseData ) {
          defaultErrorCallback( error, responseData );
        }
      });
  };

  _GlassLabSDK.prototype.createMatch = function( opponentId, success, error ) {
    // Perform the request
    this.request({
        method: "POST",
        apiKey: "createMatch",
        api: "/api/v2/data/game/" + this._options.gameId + "/create",
        contentType: "application/json",
        data: {
          invitedUsers: [opponentId]
        },
        success: function( responseData ) {
          // Get the match
          var match = JSON.parse( responseData );
          GlassLabSDK._matches[ match.id ] = match.data;

          // Call the user's success callback
          defaultSuccessCallback( success, match );
        },
        error: function( responseData ) {
          defaultErrorCallback( error, responseData );
        }
      });
  };

  _GlassLabSDK.prototype.updateMatch = function( matchId, data, nextPlayerTurn, success, error ) {
    // Perform the request
    this.request({
        method: "POST",
        apiKey: "updateMatch",
        api: "/api/v2/data/game/" + this._options.gameId + "/submit",
        contentType: "application/json",
        data: {
          matchId: matchId,
          turnData: data,
          nextPlayer: nextPlayerTurn
        },
        success: function( responseData ) {
          // Call the user's success callback
          defaultSuccessCallback( success, responseData );
        },
        error: function( responseData ) {
          defaultErrorCallback( error, responseData );
        }
      });
  };

  _GlassLabSDK.prototype.pollMatches = function( success, error ) {
    // Perform the request
    this.request({
        method: "GET",
        apiKey: "pollMatches",
        api: "/api/v2/data/game/" + this._options.gameId + "/matches",
        contentType: "application/x-www-form-urlencoded",
        success: function( responseData ) {
          // Call the user's success callback
          defaultSuccessCallback( success, responseData );
        },
        error: function( responseData ) {
          defaultErrorCallback( error, responseData );
        }
      });
  };


  _GlassLabSDK.prototype.request = function( params ) {
    // If the user is logging data locally, no need to perform the request
    if( this._options.localLogging ) {
      // Only print telemetry
      if( params.apiKey == "saveTelemEvent" ) {
        // Store the data output locally
        var output = params.data.clientTimeStamp + "\t";
        output += params.data.gameSessionEventOrder + "\t";
        output += params.data.eventName + ": ";
        output += JSON.stringify( params.data.eventData );

        // Keep a record of all logs
        this._outputText += "<p>" + output + "</p>";
        this._updateTelemetryOutputStore();

        // If the telemetry tab is already open, simply append to it
        if( this._telemetryOutputTab != null ) {
          this._telemetryOutputTab.document.write( "<p>" + output + "</p>" );
        }

        // Trigger the success callback
        params.success( "" );
      }
      // Trigger success callbacks for start session and end session
      else if( params.apiKey == "startSession" ) {
        params.success( "{ \"gameSessionId\": \"\" }" );
      }
      else if( params.apiKey == "endSession" ) {
        params.success( "" );
      }
      return;
    }

    // Display logs if enabled
    if( this._displayLogs ) {
      console.log( "GlassLabSDK request - params: ", params );
      console.log( "GlassLabSDK URI: ", this._options.uri );
    }

    // Create the XML http request for the SDK call
    this._httpRequest = new XMLHttpRequest();

    // Account for old versions of the SDK lib
    // Existing Flash SDK wrapper uses "api" and "key"
    if( params.api !== undefined && params.key !== undefined ) {
      this._httpRequest.withFlash = true;
    }
    else {
      this._httpRequest.withFlash = false;
    }

    /*
     * Set the object parameters and open the request
     * params example: { method: "GET", api: "/api/v2/data/events", contentType: "application/json", data: {} }
     * Last parameter in the open function is async: true (asynchronous) or false (synchronous)
     */
    if( this._httpRequest.withFlash ) {
      this._httpRequest.apiKey = params.key;
      this._httpRequest.open( params.method, params.api, true );
      this._httpRequest.setRequestHeader( "Content-type", params.contentType );
    }
    else {
      this._httpRequest.apiKey = params.apiKey;
      this._httpRequest.success = params.success;
      this._httpRequest.error = params.error;
      this._httpRequest.open( params.method, this._options.uri + params.api, true );
      this._httpRequest.setRequestHeader( "Content-type", params.contentType );
      this._httpRequest.setRequestHeader( "Accept", "*/*" );
      this._httpRequest.withCredentials = true;
      //this._httpRequest.setRequestHeader( "Game-Secret", this._options.gameSecret );
    }

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
    if( this._httpRequest.withFlash ) {
      this._httpRequest.send( params.data );
    }
    else {
      this._httpRequest.send( JSON.stringify( params.data ) );
    }
  }

  _GlassLabSDK.prototype.response = function( httpRequest ) {
    // Check for completed requests
    if( httpRequest.readyState === 4 ) {

      // Display logs if enabled
      if( this._displayLogs ) {
        console.log( "GlassLabSDK response code: " + httpRequest.status + ", apiKey: ", httpRequest.apiKey, ", responseText: ", httpRequest.responseText );
      }

      // OK status, send the success callback
      if( httpRequest.status === 200 || httpRequest.status == 204 || httpRequest.status === 304 ) {
        // Flash return
        if( httpRequest.withFlash ) {
          document.getElementsByName( "flashObj" )[0].success( httpRequest.apiKey, httpRequest.responseText );
        }
        else {
          httpRequest.success( httpRequest.responseText );
        }
      }
      // All other status codes will return a failure callback
      else {
        // Flash return
        if( httpRequest.withFlash ) {
          document.getElementsByName( "flashObj" )[0].failure( httpRequest.apiKey, httpRequest.responseText );
        }
        else {
          httpRequest.error( httpRequest.responseText );
        }
      }
    }
  };


  function defaultSuccessCallback( callback, data ) {
    if( callback ) {
      callback( data );
    }
    else if( GlassLabSDK._displayLogs ) {
      console.log( "[GlassLab SDK] default success callback: " + data );
    }
  }

  function defaultErrorCallback( callback, data ) {
    if( callback ) {
      callback( data );
    }
    else if( GlassLabSDK._displayLogs ) {
      console.log( "[GlassLab SDK] default error callback: " + data );
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
      localStorage.setItem( "glsdk_displayLogs", this._displayLogs ? 1 : 0 );
    }
  };

  _GlassLabSDK.prototype._getDisplayLogsStore = function() {
    var display = false;
    if( typeof( Storage ) !== "undefined" ) {
      if( localStorage.getItem( "glsdk_displayLogs" ) ) {
        display = parseInt( localStorage.getItem( "glsdk_displayLogs" ) );
        if( isNaN( display ) ) {
          display = false;
        }
      }
    }
    return display;
  };

  _GlassLabSDK.prototype._updateTelemetryOutputStore = function() {
    if( typeof( Storage ) !== "undefined" ) {
      localStorage.setItem( "glsdk_telemetry", this._outputText );
    }
  };

  _GlassLabSDK.prototype._getTelemetryOutputStore = function() {
    var telemetry = "";
    if( typeof( Storage ) !== "undefined" ) {
      if( localStorage.getItem( "glsdk_telemetry" ) ) {
        telemetry = localStorage.getItem( "glsdk_telemetry" );
      }
    }
    return telemetry;
  };

  _GlassLabSDK.prototype.resetTelemetryOutputStore = function() {
    this._outputText = "";
    this._updateTelemetryOutputStore();
    this._telemetryOutputTab = null;
  }

  _GlassLabSDK.prototype.spawnTelemetryOutputTab = function() {
    // Only proceed if the user is locally logging data
    if( this._options.localLogging ) {
      // Spawn a separate window to intercept telemetry logs
      // Need to check if we already have it open
      if( !this._telemetryOutputTab ) {
        this._telemetryOutputTab = window.open();

        // Write existing telemetry output to this tab
        this._telemetryOutputTab.document.write( this._outputText);
      }
    }
  }

  _GlassLabSDK.prototype.generateOutputFile = function() {
    // Only proceed if the user is locally logging data
    if( this._options.localLogging ) {
      this.spawnTelemetryOutputTab();
      // Create the blob data with the html output (paragraph tags removed)
      var blobOutput = this._outputText.replace( /<p>/g, "" );
      blobOutput = blobOutput.replace( /<\/p>/g, "\n" );
      var data = new Blob( [blobOutput], { type: "text/plain" } );

      // If we are replacing a previously generated file we need to manually
      // revoke the object URL to avoid memory leaks (taken from fiddle example)
      if( this._outputFile ) {
        window.URL.revokeObjectURL( this._outputFile );
      }

      // Set the output file and return it
      this._outputFile = window.URL.createObjectURL( data );
      return this._outputFile;
    }
  };


  _GlassLabSDK.prototype.getMatches = function() {
    return this._matches;
  };

  _GlassLabSDK.prototype.getMatchIds = function() {
    // Get the match Ids using the keys in the _matches blob
    var matchIds = [];
    for( var key in this._matches ) {
      matchIds.push( parseInt( key ) );
    }

    // Return the match Ids
    return matchIds;
  };

  _GlassLabSDK.prototype.getMatchForId = function( matchId ) {
    // Only proceed if we're authenticated.
    if( !this._isAuthenticated ) {
      return;
    }

    // Return an error message if the match doesn't exist
    if( !this._matches.hasOwnProperty( matchId ) ) {
      return { error: "match does not exist" };
    }
    // Return the match
    else {
      return this._matches[ matchId ];
    }
  };


  function generateDeviceId( user ) {
    // OS detect
    var os = "";
    if( navigator.userAgent.indexOf( 'Android' ) > -1 )
      os = "Android";
    else if( navigator.userAgent.indexOf( 'iPhone' ) > -1 || navigator.userAgent.indexOf( 'iPad' ) > -1 )
      os = "iOS";
    else if( navigator.userAgent.indexOf( 'OS X' ) > -1)
      os = "OSX";
    else if( navigator.userAgent.indexOf( 'Windows' ) > -1)
      os = "Windows";
    else if( navigator.userAgent.indexOf( 'Linux' ) > -1)
      os = "Linux";

    // Browser detect
    var browser = "";
    if( navigator.userAgent.indexOf( 'CrMo' ) > -1 || navigator.userAgent.indexOf( 'Chrome' ) > -1 )
      browser = "Chrome";
    else if( navigator.userAgent.indexOf( 'Firefox' ) > -1 )
      browser = "Firefox";
    else if( navigator.userAgent.indexOf( 'Safari' ) > -1 )
      browser = "Safari";
    else if( navigator.userAgent.indexOf( 'MSIE ' ) > -1 )
      browser = "IE";

    // Return the Id
    return user + "_" + os + "_" + browser;
  }


  function isObject(obj) {
    return ( Object.prototype.toString.call( obj )  === '[object Object]' );
  }

  // Make the SDK global
  window.GlassLabSDK = new _GlassLabSDK();
})();