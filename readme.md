I'm looking to build a JavaScript/TypeScript SDK that helps developers create AI
agents that learn from conversations with users. Here's what it needs to do:

- Developer provides markdown instructions ("target") telling the AI what
  information to learn from users
- Developer specifies storage backend (file, MongoDB, Firebase, SQL, etc...)
- AI has conversations (text or voice) with users to gather information
- Everything the AI learns is saved as a simple text blob ("knowledge base")
- Developer can:
  - Start conversations
  - Retrieve the knowledge base
  - Manually update the knowledge base
  - Delete the knowledge base

Example target markdown: [Insert your Planner example markdown here]

This markdown tells the AI its "mission" - what information to collect through
natural conversation. The knowledge base is just raw text of what it learns that
can be fed back as context.

Let's discuss the high-level architecture and implementation approach.
