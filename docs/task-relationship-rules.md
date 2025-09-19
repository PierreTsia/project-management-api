# Task Relationship Rules - Quick Reference

## 🎯 What This Covers

This document explains the rules for creating relationships between tasks in our project management system. There are two types of relationships:
- **Task Links**: Connections like "blocks", "relates to", "duplicates"
- **Task Hierarchy**: Parent-child relationships

## 🚫 What You CAN'T Do

### 1. One Relationship Per Pair
**Rule**: You can only have ONE relationship between any two tasks.

**Examples**:
- ❌ If Task A "blocks" Task B, you can't also make Task A "relate to" Task B
- ❌ If Task A is a parent of Task B, you can't also make Task A "block" Task B
- ❌ You can't have Task A "block" Task B AND Task B "block" Task A

### 2. Self-Connections
**Rule**: Tasks can't be connected to themselves.

**Examples**:
- ❌ Task A can't "block" Task A
- ❌ Task A can't be a parent of Task A

### 3. Cross-Project Connections
**Rule**: All related tasks must be in the same project.

**Examples**:
- ❌ Task from "Project A" can't "block" Task from "Project B"

### 4. Circular Dependencies
**Rule**: You can't create loops in task dependencies.

**Examples**:
- ❌ Task A blocks Task B, Task B blocks Task C, Task C blocks Task A

## 🔗 Task Link Rules

### Link Types Available
- **RELATES_TO**: General connection between tasks
- **BLOCKS**: Source task must complete before target task
- **DUPLICATES**: Tasks are duplicates of each other

### Special Rules for BLOCKS Links
**Rule**: Parent tasks can't block their child tasks.

**Why**: Child tasks should be able to complete independently.

**Examples**:
- ❌ If "Design UI" is parent of "Create Login Form", "Design UI" can't block "Create Login Form"
- ✅ "Design UI" can block "Implement Backend" (no hierarchy relationship)

### Special Rules for DUPLICATES Links
**Rule**: Tasks in parent-child relationships can't be duplicates.

**Why**: Parent and child tasks serve different purposes.

**Examples**:
- ❌ If "Design UI" is parent of "Create Login Form", they can't be duplicates
- ✅ "Create Login Form" can be duplicate of "Create Signup Form" (no hierarchy relationship)

### Link Limits
**Rule**: Maximum 20 links per task.

**Why**: Prevents performance issues and keeps things manageable.

## 🌳 Task Hierarchy Rules

### What is Hierarchy?
Parent-child relationships where one task is a "sub-task" of another.

**Examples**:
- "Design UI" → "Create Login Form" → "Style Login Button"
- "Build E-commerce Site" → "Setup Database" → "Create User Table"

### Hierarchy Rules

#### 1. No Self-Hierarchy
**Rule**: Tasks can't be their own parent or child.

#### 2. No Circular Hierarchy
**Rule**: Can't create parent-child loops.

**Examples**:
- ❌ Task A is parent of Task B, Task B is parent of Task A

#### 3. Depth Limit
**Rule**: Maximum hierarchy depth (currently 10 levels).

**Why**: Prevents UI/UX issues with too much nesting.

#### 4. No Links with Hierarchy
**Rule**: If tasks have a hierarchy relationship, they can't also have links.

**Why**: Enforces "one relationship per pair" rule.

## ✅ What You CAN Do

### 1. Create Links Between Different Task Pairs
- Task A can "block" Task B
- Task A can "relate to" Task C
- Task B can "duplicate" Task D

### 2. Create Hierarchy Between Different Task Pairs
- Task A can be parent of Task B
- Task C can be parent of Task D
- Task E can be child of Task F

### 3. Mix Links and Hierarchy (Different Pairs)
- Task A "blocks" Task B
- Task C is parent of Task D
- This is perfectly fine!

## 🚨 Common Error Messages

| Error Message | What It Means | How to Fix |
|---------------|---------------|------------|
| "A relationship already exists between these tasks" | You're trying to create a second relationship between the same tasks | Delete the existing relationship first, or choose different tasks |
| "A parent task cannot block its child task" | You're trying to make a parent block its child | Remove the hierarchy relationship, or choose different tasks |
| "Tasks in a parent-child relationship cannot be duplicates" | You're trying to make parent and child tasks duplicates | Remove the hierarchy relationship, or choose different tasks |
| "Maximum number of links per task exceeded" | Task already has 20 links | Delete some existing links first |
| "This link would create a circular dependency" | The link would create a loop | Choose different tasks or remove existing links |

## 🎯 Quick Decision Guide

**Want to create a relationship? Ask yourself:**

1. **Do these tasks already have ANY relationship?**
   - If YES → You can't create another one
   - If NO → Continue to step 2

2. **What type of relationship do you want?**
   - **Link** → Check if it violates BLOCKS or DUPLICATES rules
   - **Hierarchy** → Make sure no links exist between these tasks

3. **Are the tasks in the same project?**
   - If NO → Move one task to the same project first
   - If YES → You're good to go!

## 🔧 For Developers

### Validation Order
The system checks rules in this order (stops at first failure):

**For Links:**
1. Same project?
2. Self-linking?
3. One relationship per pair?
4. Link limit exceeded?
5. Circular dependency?
6. Hierarchy conflict?
7. Type-specific rules (BLOCKS, DUPLICATES)

**For Hierarchy:**
1. Self-hierarchy?
2. Circular hierarchy?
3. Depth limit?
4. Hierarchy conflict?
5. Link conflict?

### Configuration
- **Link Limit**: 20 per task (configurable)
- **Hierarchy Depth**: 10 levels (configurable)
- **Error Messages**: Internationalized (i18n)

---

*Need more technical details? See [task-relationship-validation-schema.md](./task-relationship-validation-schema.md)*
