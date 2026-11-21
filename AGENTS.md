# Architecture rules
- Operation forms share SubAccountFields and pure sub-account selection helpers; analytic entities are linked by parent account number and type, preventing cross-account suggestions.
- Preserve existing transaction property names when replacing account selectors so stored operations remain readable.