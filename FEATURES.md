# Nexus Application Features

This document outlines the main features of the Nexus application's main page.

## Main Page (Home)

The main page of the application is a feed of posts, designed to be interactive and user-friendly.

### Core Components

- **Navigation Bar:** A persistent navigation bar at the top of the page provides access to the "Home" and "Leaderboard" pages. It also includes a search button, a theme toggle, and a user profile dropdown.
- **Feed View Switcher:** Allows users to switch between different views of the feed:
  - **Timeline:** A chronological view of the posts.
  - **Merged Discussions:** A view that groups related posts together.
  - **Most Relevant:** A view that displays posts based on their relevance to the user.
- **Feed Controls:** Provides options to filter and sort the feed content.
- **Enhanced Post Card:** Each post is displayed in a card format with the following details:
  - Author's name, username, and avatar.
  - Post content.
  - Timestamp.
  - Number of upvotes and comments.
  - Tags associated with the post.
  - Images attached to the post.
- **Floating Action Button:** A button at the bottom-right of the screen that opens a modal to create a new post.
- **Error Boundary:** A component that catches and handles errors in the UI, preventing the entire application from crashing.

### User Interactions

- **Upvoting:** Users can upvote posts they find interesting.
- **Creating Posts:** Users can create new posts using the floating action button.
- **Switching Views:** Users can change the feed view to suit their preferences.
- **Filtering and Sorting:** Users can filter and sort the feed to see only the content they are interested in.
- **Searching:** Users can initiate a search from the navigation bar.