# Knowledge base: Tallow & Pine

**All content in this folder is fictional sample data.** Tallow & Pine is not a real store. The phone
number (503-555-01xx range), the `.example` email domain, the prices and every policy were invented
for a demonstration of a customer support chatbot. Do not rely on them.

These 15 files are the only source the chatbot may answer from. Each file starts with a `title` and a
`slug` in frontmatter and is split into `##` sections, which the ingestion script (Phase 3) uses as chunk
boundaries. This README is not a policy page and is skipped by ingestion.

| Slug                     | Title                      |
| ------------------------ | -------------------------- |
| `about-us`               | About Tallow & Pine        |
| `shipping-us`            | Shipping in the US         |
| `international-shipping` | International shipping     |
| `returns-exchanges`      | Returns and exchanges      |
| `refunds`                | Refunds                    |
| `payment-methods`        | Payment methods            |
| `order-tracking`         | Order tracking             |
| `size-guide`             | Size guide                 |
| `fabric-care`            | Fabric and care            |
| `alterations`            | Alterations                |
| `damaged-or-wrong-item`  | Damaged or wrong item      |
| `discounts-loyalty`      | Discounts and loyalty      |
| `privacy-policy`         | Privacy policy             |
| `terms-of-sale`          | Terms of sale              |
| `faq`                    | Frequently asked questions |

Check the files with `pnpm check:content` (frontmatter, unique slugs, 300–800 words each).
