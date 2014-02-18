---
layout: default
title: "Project Methodology"
---

A methodology used during the project starting from the development process to the technologies used in the project.

## Development Process

The most important reason why this project has succeeded is the development process that was enforced on me by my supervisor
[![in](https://raw.github.com/korya/hp-ide-code-review-extension/gh-pages/images/linkedin-logo-icon.png)Liron Tzabari](http://www.linkedin.com/pub/liron-tzabari/60/114/a59).
Thanks, Liron! It really helped me to keep focused.

### Milestones

The project is divided to 3 main milestones:

1. **Develop server infrastructure**

   The 2 main goals of the milestone is to get familiar with the IDE
   and develop extension's back-end infrastructure on the server side.
   
    * client side:
       - add simple form allowing to send a dummy code request
       - add simple UX showing user's code requests
    * server side:
       - accept code requests sent by users
       - store these requests
       - forward them to the reviewer

   The first one of 2 project risks is handled in the milestone.

2. **Integrate Orion's Compare widget**

   The goal of the milestone:
   - integrate Orion's Compare widget
   - user can see a diff of 2 files in Orion's Compare widget

   The second one of 2 project risks is handled in the milestone.

3. **Develop a Code Review extension**

   After the 2 main risks of the projects are handled, it is possible
   to develop the code review system itself. Most of the development
   is done in this milestone, although its time estimation is not more
   than each of the first two.
   
   Tasks:
    - create a new dedicated view (page) for handling code review requests 
    - user should be able to create a new code review request
       - select a change
       - select a reviewer
    - reviewer/author should be able to add comments: per file:line, per file, per review
    - reviewer should be able to approve/reject a review
    - reviewer should be able to navigate through changed files
    - reviewer should be able to see a diff of a new file content and its original content
    - notification for different events:
       - incoming code review request
       - new comment
       - changed state

### Weekly meetings

In addition to the global milestones, we had a weekly remote meeting.
We could not meet physically, hence we met virtually: we had a weekly meeting over Skype:

 1. I described my current status and current issues.
 2. I demonstrated to Liron, when there was something to show, a new features/functionality.
 3. Liron and I defined a goal for the next week.
   (Usually, it was some goal that can be visualized. For example, add a new input field for selecting one commit from a list of project commits. This approach very helped me to make a progress.)
 4. Liron sent a summarizing mail: current status, current issues, my action points, his action points.

The weekly summary mail helped a lot to track project progress, to keep stay focused, and to get ahead towards the milestone and project goals.

### Unplanned meetings

Of course, in case of any problem I could always contact Liron and ask him to help me.


## Technology Overview

### IDE Architecture

The IDE is a web single page application, 100% Javascript: both server and client code. Among the features of the IDE is extensibility:
 - in the core of the application there is only an extension loader
 - everything else is extension
 - extension provides some feature/functionality; for example, layout extension, git extension, code review extension
 - extension is a set of modules; each module is a logically separate part of the extension providing one service
 - dependency injection is supported for modules (either of the same extension or different extensions)
 - each module consists of one or more javascript files

### Server

The server runs on [Node.js](http://nodejs.org) infrastructure with its huge amount of packages over the net.

[Express](http://expressjs.com) is used to run HTTP server.

The server modules expose a [RESTful API](http://www.looah.com/source/view/2284) to serve its clients. In order to send a push notification from the server to a client [socket.io](http://socket.io) is used.

### Client

[Bower](https://github.com/bower/bower) is used for client's package management.

[Underscore.js](http://underscorejs.org) is available in the client.

[RequireJS](http://requirejs.org) is used to load all javascript files and to resolve intra-module dependencies. Every Javascript file is a RequireJS module, which can be required by other files.

There is [Jquery](http://jquery.com) available in the client that can be used for HTML manipulation and etc. But [AngularJS](http://angularjs.org) is preferred. Usually, an extension's module exposes some AngularJS service, that can be requested later by other 
