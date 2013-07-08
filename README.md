gazer
=====

This project aims to analyze followers base of a GitHub repository and suggest related projects. It is using information about shared number of stars to calculate similarity index between two projects.

Try it yourself
--------------------
Hosted version of the app is available here: http://www.yasiv.com/github/#/ It already knows about approximately 8,000 popular projects. If your project had more than 200 stars on Jul 1st, most likely you will get suggestions immediately. Otherwise the site will build similarities in the realtime. Make sure to sort by "Similarity coefficient" when application completes gathering information.

Hows and Whys
-------------
It's kind of experiment of my own curiosity. I wanted to find a mobile UI library for the web. After googling around I found a library, but I wanted to see more related projects. GitHub did not provide this feature, so I developed a simple metric to calculate similarity of two projects.

```js
// Metric 1: Similarity measure of two projects A and B.
similarity = 2 * sharedStarsCount(A, B)/(numberOfStars(A) + numberOfStars(B));
```

While this is very naive formula, in practice it gives interesting results. For example, among top related projects for my graph drawing library  [vivagraph.js](https://github.com/anvaka/VivaGraphJS) (650 stars):

* [strathausen/dracula](https://github.com/strathausen/dracula) - JavaScript browser based layout and representation of connected graphs. (274 stars)
* [jacomyal/sigma.js](https://github.com/jacomyal/sigma.js) - an open-source lightweight JavaScript graph drawing library (1,395 stars)
* [samizdatco/arbor](https://github.com/samizdatco/arbor) - a graph visualization library using web workers and jQuery (1,221 stars)
* [dhotson/springy](https://github.com/dhotson/springy) - A force directed graph layout algorithm in JavaScript (639 stars)
* [uskudnik/GraphGL](https://github.com/uskudnik/GraphGL) - A network visualization library (70 stars)

For popular projects, with more than 2-3k stars, the metric [1] can be polluted by other popular projects (like Backbone, or Bootstrap): We, developers, all tend to like beautiful code. Surprisingly, the amount of "popular noise" can be significantly reduced by analyzing limited subset of random stargazers. Metric [1] can be rewritten as

```js
// Metric 2: Similarity measure of two popular projects A and B
weight = randomSubsetSize/numberOfStars(A);
similarity 2 * sharedStarsCount(A, B)/(weight * (randomSubsetSize + numberOfStars(B)));
```

Here is an example of [angular.js](https://github.com/angular/angular.js) (11K followers) analysis on random subset of 500 followers:

* [angular-ui/angular-ui](https://github.com/angular-ui/angular-ui) - AngularUI - The companion suite for AngularJS (2,119 stars)
* [angular/angular-seed](https://github.com/angular/angular-seed) - Seed project for angular apps. (1,998 stars)
* [jmcunningham/AngularJS-Learning](https://github.com/jmcunningham/AngularJS-Learning) - A bunch of links to blog posts, articles, videos, etc for learning AngularJS (2,465 stars)
* [angular-ui/bootstrap](https://github.com/angular-ui/bootstrap) - Native AngularJS (Angular) directives for Twitter's Bootstrap. Small footprint (5kB gzipped!), no 3rd party JS dependencies (jQuery, bootstrap JS) required! (1,320 stars)
* [mgcrea/angular-strap](https://github.com/mgcrea/angular-strap) - Bootstrap directives for Angular (1,177 stars) 

Caveats
------------
* Github does not have a bulk API, which makes processing of popular projects extremely time consuming. It could be mitigated by serving precomputed suggestions. If suggestions are not available, the time can further be reduced by limiting amount of stars to analyze (see metric [2]).
* Number of requests to GitHub API is rate limited (60 per hour). Sign in to the application with OAuth to increase rate limit up to 5,000 requests per hour.
* Analyzing randomized subset may produce different ranking and pick different projects as the best match. But you will notice the same projects are being picked between multiple runs of the algorithm. Pay attention to those.
* The algorithm will not work for projects with small amount of stars. I'm still not sure what is the lower bound here (100 stars?). For projects with 500+ stars quite often results are interesting.

Local build
-----------
```sh
git clone https://github.com/anvaka/gazer.git
cd gazer
npm install
bower install
grunt server
```

What do you think?
----------------------------
I would love to hear your feedback! 

If you know how to make distance calculation better - I'm very open to incorporate your metrics.

This is my first angular app, so I'm still learning.

If you work at GitHub - I would love to see this feature implemented by you, guys :)

Do not hesitate to open an issue or submit a pull request :).
