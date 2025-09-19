# Task Relationship Cheat Sheet

## 🚫 The Golden Rules

1. **One relationship per pair** - Only ONE connection between any two tasks
2. **No self-connections** - Tasks can't connect to themselves  
3. **Same project only** - All related tasks must be in the same project
4. **No loops** - Can't create circular dependencies

## 🔗 Task Links

| Link Type | What It Means | Special Rules |
|-----------|---------------|---------------|
| **RELATES_TO** | General connection | None |
| **BLOCKS** | Must complete first | ❌ Parent can't block child |
| **DUPLICATES** | Same task | ❌ Parent/child can't be duplicates |

**Limit**: 20 links per task

## 🌳 Task Hierarchy

- **Parent-Child**: One task is a sub-task of another
- **Tree Structure**: Can have multiple levels
- **Limit**: 10 levels deep

**Rule**: If tasks have hierarchy, they can't have links (and vice versa)

## ✅ Quick Examples

### ✅ Allowed
- Task A "blocks" Task B
- Task A "relates to" Task C  
- Task D is parent of Task E
- Task F is child of Task G

### ❌ Not Allowed
- Task A "blocks" Task B AND Task A "relates to" Task B
- Task A "blocks" Task A (self-connection)
- Task A (parent) "blocks" Task B (child)
- Task A (parent) "duplicates" Task B (child)

## 🚨 Common Errors

| Error | Fix |
|-------|-----|
| "Relationship already exists" | Delete existing relationship first |
| "Parent cannot block child" | Remove hierarchy or choose different tasks |
| "Cannot be duplicates" | Remove hierarchy or choose different tasks |
| "Link limit exceeded" | Delete some existing links |
| "Circular dependency" | Remove links that create loops |

## 🎯 Decision Tree

```
Want to connect tasks?
├── Already connected? → ❌ Delete first
├── Same project? → ❌ Move to same project
├── Want link?
│   ├── Parent/child? → ❌ Remove hierarchy first
│   └── Type-specific rules? → Check BLOCKS/DUPLICATES
└── Want hierarchy?
    └── Have links? → ❌ Remove links first
```

---

*For detailed technical docs, see [task-relationship-validation-schema.md](./task-relationship-validation-schema.md)*
