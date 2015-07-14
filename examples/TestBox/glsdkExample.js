/*************************************************************************************************************
 *
 *	glsdkExample.js
 *
 *	Description: Example code to run the glass lab services sdk example.
 *
 *	Comments: 
 *
 *************************************************************************************************************/

(function (glsdkExample)
{
	/**
	 * Sets up the example buttons
	 * @param divID The id of the div containing the buttons
	 */
	(glsdkExample.Init = function(divID)
	{
		// Get all the keys from document
		var keys = document.querySelectorAll("#" + divID + " span"); // Note: looking for all spans seems dangerous...

		// Add an onclick function to each of the keys.
		for (var i = 0; i < keys.length; i++)
		{
			keys[i].onclick = function(event)
			{
				// Get the input and button values
				var input = document.querySelector(".commandButtons");
				var button = this.innerHTML;
				
				if (button == "connect")
					InitializeSDK();
				else if (button == "local")
					LocalInitSDK();
				else if (button == "login")
					Login();
				else if (button == "logout")
					Logout();
				else if (button == "getAuthStatus")
					GetAuthStatus();
				else if (button == "getUserInfo")
					GetUserInfo();
				else if (button == "getPlayerInfo")
					GetPlayerInfo();
				else if (button == "enroll")
					Enroll();
				else if (button == "unenroll")
					Unenroll();
				else if (button == "getCourses")
					GetCourses(false);
				else if (button == "getCourses members")
					GetCourses(true);
				else if (button == "getCourse")
					GetCourse(false);
				else if (button == "getCourse members")
					GetCourse(true);
				else if (button == "startSession")
					StartSession();
				else if (button == "saveTelemEvent")
					SaveTelemEvent();
				else if (button == "endSession")
					EndSession();
				else if (button == "saveAchievement")
					CreateAchievement();
				else if (button == "getAchievements")
					GetAchievements();
				else if (button == "postSaveGame")
					SaveGame();
				else if (button == "getSaveGame")
					GetSaveGame();
				else
					console.log("onclick Unknown button name: " + button);
				
				// prevent page jumps
				event.preventDefault();
			}
		}
	});

	/** Initializes the sdk by connecting to the glass lab development server. */
	function InitializeSDK()
    {
        // First check if the GlassLab SDK object is even defined.
        // If not, we're done proceeding but want to message that the SDK could not be loaded.
        // The SDK won't load when testing on the local file system, but will when run from a web server.
        if (typeof GlassLabSDK == "undefined")
        {
            // SDK is unavailable
           	SetOutput("GlassLabSDK is missing.");
            console.log( "glsdkExample.InitializeSDK: The SDK is unavailable!" );
            return;
        }

        // We're now attempting to initialize the SDK
        var _this = glsdkExample;
        console.log( "glsdkExample.InitializeSDK: Pending connection to the server..." );

        // Attempt to connect to the server. Set the URI if the host is not playfully.org
        // TODO: check if the host is playfully.org and ignore setting the URI
        GlassLabSDK.connect( "TEST", "https://developer.playfully.org",
	        function( data )
	        {
	            console.log("glsdkExample.InitializeSDK: Connection successful: " + data );
	            SetOutput("connect success", data);
	        },
	        function( data )
	        {
	            console.log("glsdkExample.InitializeSDK: Connection failed: " + data );
	            SetOutput("connect error", data);
	        });
    }

	/** Initializes the sdk by connecting locally and logging locally. */
	function LocalInitSDK()
    {
        // First check if the GlassLab SDK object is even depolfined.
        // If not, we're done proceeding but want to message that the SDK could not be loaded.
        // The SDK won't load when testing on the local file system, but will when run from a web server.
        if (typeof GlassLabSDK == "undefined")
        {
            // SDK is unavailable
         	SetOutput("GlassLabSDK is missing.");
            console.log( "glsdkExample.InitializeSDK: The SDK is unavailable!" );
            return;
        }

        // Manually set local logging for the SDK
    	GlassLabSDK.setOptions( { localLogging: true, dispatchQueueUpdateInterval: 500 } );
    	console.log( "glsdkExample.InitializeSDK:  Local instance..." );

    	// Turn on console logging
    	GlassLabSDK.displayLogs();
	}

	/** Logs in to the glass lab services. */
	function Login()
	{
		var username = document.getElementById('gl-username').value;
		var password = document.getElementById('gl-password').value;
		GlassLabSDK.login(username, password,
			function (data)
			{
	            console.log("glsdkExample.Login: Success: " + data );
	            SetOutput("login success", data);
			},
			function (data)
			{
	            console.log("glsdkExample.Login: Fail: " + data );
	            SetOutput("login error", data);
			});
	}

	/** Logs out the current user from the glass lab services. */
	function Logout()
	{
		GlassLabSDK.logout(function(data)
			{
	            console.log("glsdkExample.Logout: Success: " + data );
	            SetOutput("logout success", data);
			},
			function (data)
			{
	            console.log("glsdkExample.Login: Fail: " + data );
	            SetOutput("logout error", data);
			});
	}

	/** Gets authorization status about the current user. */
	function GetAuthStatus()
	{
		GlassLabSDK.getAuthStatus(function(data)
			{
	            console.log("glsdkExample.GetAuthStatus: Success: " + data );
	            SetOutput("getAuthStatus success", data);
			},
			function (data)
			{
	            console.log("glsdkExample.GetAuthStatus: Fail: " + data );
	            SetOutput("getAuthStatus error", data);
			});
	}

	/** Gets information about the current player. */
	function GetPlayerInfo()
	{
		GlassLabSDK.getPlayerInfo(function(data)
			{
	            console.log("glsdkExample.GetPlayerInfo: Success: " + data );
	            SetOutput("getPlayerInfo success", data);
			},
			function (data)
			{
	            console.log("glsdkExample.GetPlayerInfo: Fail: " + data );
	            SetOutput("getPlayerInfo error", data);
			});
	}

	/** Gets information about the current user. */
	function GetUserInfo()
	{
		GlassLabSDK.getUserInfo(function(data)
			{
	            console.log("glsdkExample.GetUserInfo: Success: " + data );
	            SetOutput("getUserInfo success", data);
			},
			function (data)
			{
	            console.log("glsdkExample.GetUserInfo: Fail: " + data );
	            SetOutput("getUserInfo error", data);
			});
	}

	/** Enroll to a course. */
	function Enroll()
	{
		var code = document.getElementById('gl-enrollcourseid').value;
		GlassLabSDK.enroll(code, function(data)
			{
	            console.log("glsdkExample.Enroll: Success: " + data );
	            SetOutput("enroll success", data);
			},
			function (data)
			{
	            console.log("glsdkExample.Enroll: Fail: " + data );
	            SetOutput("enroll error", data);
			});
	}

	/** Unenroll from a course. */
	function Unenroll()
	{
		var code = document.getElementById('gl-unenrollcourseid').value;
		GlassLabSDK.unenroll(code, function(data)
			{
	            console.log("glsdkExample.Unenroll: Success: " + data );
	            SetOutput("unenroll success", data);
			},
			function (data)
			{
	            console.log("glsdkExample.Unenroll: Fail: " + data );
	            SetOutput("unenroll error", data);
			});
	}

	/**
	 * Gets all the courses for a user.
	 * showMembers if true, shows all the members in the courses in the same class as the user.
	 */
	function GetCourses(showMembers)
	{
		GlassLabSDK.getCourses(showMembers, function(data)
			{
	            console.log("glsdkExample.GetCourses: Success: " + data );
	            SetOutput("getCourses success", data);
			},
			function (data)
			{
	            console.log("glsdkExample.GetCourses: Fail: " + data );
	            SetOutput("getCourses error", data);
			});
	}

	/**
	 * Gets course information.
	 * @param showMembers if true, includes members in the course in the same class as the user.
	 */
	function GetCourse(showMembers)
	{
		var code;
		if (showMembers)
			code = document.getElementById('gl-getcourseidmembers').value;
		else
			code = document.getElementById('gl-getcourseid').value;
		GlassLabSDK.getCourse(code, showMembers, function(data)
			{
	            console.log("glsdkExample.GetCourse: Success: " + data );
	            SetOutput("getCourse success", data);
			},
			function (data)
			{
	            console.log("glsdkExample.GetCourse: Fail: " + data );
	            SetOutput("getCourse error", data);
			});
	}

	/** Starts a telemetry session. */
	function StartSession()
	{
		GlassLabSDK.startSession(function(data)
			{
	            console.log("glsdkExample.StartSession: Success: " + data );
	            SetOutput("startSession success", data);
			},
			function (data)
			{
	            console.log("glsdkExample.StartSession: Fail: " + data );
	            SetOutput("startSession error", data);
			});
	}

	/** Caches a telemetry event. */
	function SaveTelemEvent()
	{
		GlassLabSDK.saveTelemEvent("telem name", {fakedata:"data"}, function(data)
			{
	            console.log("glsdkExample.SaveTelemEvent: Success: " + data );
	            SetOutput("saveTelemEvent success", data);
			},
			function (data)
			{
	            console.log("glsdkExample.SaveTelemEvent: Fail: " + data );
	            SetOutput("saveTelemEvent error", data);
			});
	}

	/** Ends the current telemetry session and flushes the data to the server. */
	function EndSession()
	{
		GlassLabSDK.endSessionAndFlush(function(data)
			{
	            console.log("glsdkExample.EndSession: Success: " + data );
	            SetOutput("endSession success", data);
			},
			function (data)
			{
	            console.log("glsdkExample.EndSession: Fail: " + data );
	            SetOutput("endSession error", data);
			});
	}

	/** Creates an achievement. */
	function CreateAchievement()
	{
		GlassLabSDK.saveAchievement("item", "group", "subGroup", function(data)
			{
	            console.log("glsdkExample.CreateAchievement: Success: " + data );
	            SetOutput("saveAchievement success", data);
			},
			function (data)
			{
	            console.log("glsdkExample.CreateAchievement: Fail: " + data );
	            SetOutput("saveAchievement error", data);
			});
	}

	/** Gets all the achievements. */
	function GetAchievements()
	{
		GlassLabSDK.getAchievements(function(data)
			{
	            console.log("glsdkExample.GetAchievements: Success: " + data );
	            SetOutput("getAchievements success", data);
			},
			function (data)
			{
	            console.log("glsdkExample.GetAchievements: Fail: " + data );
	            SetOutput("getAchievements error", data);
			});
	}

	/** Saves out test data to the server. */
	function SaveGame()
	{
		GlassLabSDK.postSaveGame({test: "test val"}, function(data)
			{
	            console.log("glsdkExample.SaveGame: Success: " + data );
	            SetOutput("postSaveGame success", data);
			},
			function (data)
			{
	            console.log("glsdkExample.SaveGame: Fail: " + data );
	            SetOutput("postSaveGame error", data);
			});
	}

	/** Gets saved game data from the server. */
	function GetSaveGame()
	{
		GlassLabSDK.getSaveGame(function(data)
			{
	            console.log("glsdkExample.GetSaveGame: Success: " + data );
	            SetOutput("getSaveGame success", data);
			},
			function (data)
			{
	            console.log("glsdkExample.GetSaveGame: Fail: " + data );
	            SetOutput("getSaveGame error", data);
			});
	}

	/**
	 * Finds the output div and puts some text into it.
	 * @param name The name of the command that is doing the output.
	 * @param data The results from the server.
	 */
	function SetOutput(name, data)
	{
		var output = document.querySelector(".output");
		if (output != null)
			output.innerHTML = "<h3 style=\"text-align:left\">Command " + name + " output:<br></h3>" + data + "<br><br>";
	}

})(glsdkExample = glsdkExample||{});
var glsdkExample;