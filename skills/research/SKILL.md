---
name: research
description: Research and investigation skills. Use for "research this", "investigate", "find out", "autoresearch:", and "deep dive".
trigger: /omp:research
autoinvoke: false
---

## Skill: research

Conduct thorough research and investigation on topics.

## When to Use

- Unknown or unfamiliar topics
- Need comprehensive understanding
- Fact-finding missions
- Competitive analysis
- Technology evaluation

## Research Process

### 1. Define Scope
- What do we need to know?
- How deep to go?
- What sources to check?
- Timeline constraints

### 2. Gather Sources
- Official documentation
- Expert opinions
- Community discussions
- Real-world usage

### 3. Synthesize
- Extract key information
- Identify patterns
- Note contradictions
- Build understanding

### 4. Analyze
- Compare options
- Evaluate trade-offs
- Assess quality
- Rate confidence

### 5. Present
- Clear findings
- Source attribution
- Confidence levels
- Recommendations

## Source Types

### Primary Sources
- Official documentation
- Source code
- API specifications
- Original research

### Secondary Sources
- Expert blogs
- Technical articles
- Tutorial content
- Community posts

### Social Proof
- Usage statistics
- Adoption rates
- Community size
- Support availability

## Research Methods

### Code Archaeology
- Read source code
- Trace execution
- Find patterns
- Understand internals

### Documentation Mining
- API docs
- README files
- Change logs
- Migration guides

### Web Research
- Search engines
- Specialized forums
- Stack Overflow
- GitHub issues

### Expert Consultation
- Ask practitioners
- Find case studies
- Get benchmarks
- Collect opinions

## Agent Routing

Delegate research tasks to the `document-specialist` agent (standard tier). For deep code archaeology, use the `explore` agent. For architecture trade-offs, escalate to the `architect` agent.

State for in-progress research is stored under `.omp/research/`.

## Output Format

```
## Research: {topic}

### Scope
**Questions:** {what we need to know}
**Depth:** {surface/deep/comprehensive}
**Timeline:** {constraints}

### Sources Consulted
| Source | Type | Relevance | Confidence |
|--------|------|-----------|------------|
| {source} | {type} | High | High |

### Findings

#### Topic 1: {title}
**Summary:** {what we learned}
**Source:** {source}
**Confidence:** {level}

#### Topic 2: {title}
...

### Analysis
{comparisons and synthesis}

### Recommendations
1. **{rec}** — {rationale}

### Confidence
- **Overall:** {level}
- **Gaps:** {what we don't know}

### Further Research
{what would improve confidence}
```

## Constraints

- Verify information independently
- Note source quality
- Be clear about confidence
- Avoid bias in selection
- Cite your sources
