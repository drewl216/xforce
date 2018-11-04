
/**
	class used to create server messages
*/
class ServerMessage {


/*************************
	message generations functions
*************************/

	/**
		add objects to the clients list
		@return string
		@param Obj[] objs the array of objects to send to the client
	*/
	static addObjects(objs) {
		var messageObject = {};

		messageObject.type="add";
		messageObject.objs = Array();
		
		for(var i=0;i<objs.length;i++) {
			messageObject.objs.push(objs[i].getToSerialize());
		}
		return JSON.stringify(messageObject);
	}

	/**
		sends the id of the player to the client
		@return string
	*/
	static setPlayerObject(id)
	{
		var messageObject = {};
		messageObject.type="setPlayerId";
		messageObject.id = id;
		return JSON.stringify(messageObject);
}

	/**
		parses a message from the server
		@return object guarentied to have a type attribute
	*/
	static parseServerMessage(message)
	{
		var messageObject = JSON.parse(message);
	
		if (typeof messageObject.objs !== "undefined") {
			for(var i=0;i<messageObject.objs.length;i++)
			{
				messageObject.objs[i] = Obj.unSerialize(messageObject.objs[i]);
			}
		}
		return messageObject;
	}
}

/**
	allow the code to be loaded in either the browser or nodejs
*/
if (typeof module !== 'undefined') {
	module.exports=ServerMessage;
};
