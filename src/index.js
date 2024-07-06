"use strict";
module.exports = {
  register({ strapi }) {},
  bootstrap(/* { strapi } */) {
    const io = require("socket.io")(strapi.server.httpServer, {
      cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    io.on("connection", function (socket) {
      socket.on("join", async ({ username }) => {
        console.log("user connected");
        console.log("username is ", username);

        if (username) {
          socket.join("group1");

          // Fetch initial message history from Strapi
          var axios = require("axios");
          try {
            const response=await strapi.db.query("api::message.message").findMany({
              orderBy:{
                createdAt:'desc'
              }
            });
            console.log(response);

            const messages = response.map((msg) => ({
              user: msg.username,
              text: msg.message,
              userId:msg?.userId,
              createdAt: msg.createdAt,
            }));

            // Send initial message history to the user
            socket.emit("history", messages.reverse());

          } catch (error) {
            console.log("Error fetching message history:", error.message);
          }
        } else {
          console.log("An error occurred");
        }
      });

      socket.on("sendMessage", async (data) => {
        console.log(data);
        let strapiData = {
          data: {
            ...data
          },
        };
        var axios = require("axios");
        await axios
          .post("http://127.0.1:1337/api/messages", strapiData)
          .then((e) => {
            socket.broadcast.to("group").emit("message", {
              user: data.username,
              text: data.message,
              userId:data?.userId
            });
            console.log("Emitted to users!");
          })
          .catch((e) => console.log("error", e.message));
      });

      socket.on("loadMore", async (page) => {
        console.log("Loading more messages, page:", page);
        var axios = require("axios");
        try {
          const response = await axios.get("http://127.0.1:1337/api/messages", {
            params: {
              pagination: {
                page: page,
                // pageSize: 25, // Change the pageSize as needed
              },
              sort: ["createdAt:desc"], // Sort by creation date descending
            },
          });
          const messages = response.data.data.map((msg) => ({
            user: msg.attributes.username,
            text: msg.attributes.message,
            createdAt: msg.attributes.createdAt,
          }));

          // Send additional messages to the user
          socket.emit("moreMessages", messages.reverse());
        } catch (error) {
          console.log("Error loading more messages:", error.message);
        }
      });
    });
  },
};
