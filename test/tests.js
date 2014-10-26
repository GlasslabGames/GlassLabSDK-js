var assert = chai.assert;


describe( 'All API Calls', function() {
	it( 'connect', function() {
		GlassLabSDK.displayLogs();
		GlassLabSDK.setOptions( { uri: "http://127.0.0.1:8001" } );
		GlassLabSDK.connect( "SC",
			function( responseData ) {
				console.log( "Success: " + responseData );
				assert.ok();
			},
			function( responseData ) {
				console.log( "Failure: " + responseData );
				assert.fail();
			});
	});
});