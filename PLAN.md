# PLAN.md

# Theatrical Industry Analytics

## Overview

This project is an investor- and analyst-focused dashboard for the movie theater industry.

The core question is:

> How healthy is the theatrical exhibition industry right now, which theater chains are performing best, what risks do they face, and does the future film slate suggest conditions are improving or deteriorating?

The dashboard should make the economics of the theater business understandable without requiring the user to already know the industry.

This is not a consumer movie-discovery app, a generic box-office tracker, or an academic economics project.

It should resemble the type of tool a business analyst, equity analyst, investor, consultant, or strategy team could use when evaluating the theatrical exhibition industry or a company such as AMC.

## Scope

The initial focus is:

* U.S./North American theatrical exhibition
* AMC Entertainment
* Cinemark
* Marcus Theatres
* Historical box-office performance
* Theater operating performance
* Company financial health
* Upcoming theatrical film supply

The dashboard should combine industry-level data with company-level financial and operating data.

## Analytical Model

The core business relationship is:

```text
Film supply and audience demand
            ↓
        Attendance
            ↓
    ┌───────┴────────┐
    │                │
Ticket spending   Food & beverage
    │                │
    └───────┬────────┘
            ↓
         Revenue
            ↓
     Operating profit
            ↓
        Cash flow
            ↓
Debt service, investment,
and shareholder value
```

The dashboard should help users understand each part of this relationship.

A company can improve revenue even while attendance declines if it increases revenue per patron.

Likewise, strong industry box office does not necessarily mean a theater operator is financially healthy if debt, interest costs, leases, or capital requirements consume its cash flow.

The product should highlight these distinctions.

---

# Dashboard Areas

## Industry Overview

The overview should answer:

> What is happening to theatrical demand?

Important information includes:

* Domestic box office
* Box office growth versus the previous year
* Recovery relative to pre-pandemic levels
* Daily, monthly, annual, and cumulative box-office trends
* Number of theatrical releases
* Number of wide theatrical releases
* Highest-grossing films
* Concentration of box office among the largest films
* Distributor/studio market share
* Seasonality
* Estimated ticket volume where available
* Historical average ticket prices where available

The overview should make it easy to distinguish between:

* revenue growth caused by stronger attendance
* revenue growth caused by higher ticket prices
* unusually strong or weak film supply
* dependence on a small number of blockbuster releases

### Important Derived Measures

Examples include:

```text
YTD Box Office

Comparable-Period YoY Growth

Recovery vs 2019

Top-5 Film Concentration

Top-10 Film Concentration

Release Count

Wide Release Count

Distributor Market Share
```

For recovery comparisons:

```text
Recovery vs 2019 =
Current Comparable-Period Box Office
/
2019 Comparable-Period Box Office
```

Comparisons should use equivalent periods rather than comparing an incomplete current year against a completed historical year.

---

# Theater Operator Comparison

The dashboard should compare major publicly traded theater operators.

Initial companies:

* AMC Entertainment
* Cinemark
* Marcus

The comparison should answer:

> Which operator is performing best operationally?

> Which operator monetizes its customers most effectively?

> Which operator has the strongest financial position?

> Which operator has the greatest financial risk?

Important operating metrics include:

* Attendance
* Attendance growth
* Admissions revenue
* Food and beverage / concession revenue
* Other theater revenue
* Average ticket price
* Food and beverage revenue per patron
* Revenue per patron
* Theater count
* Screen count
* Geographic exposure
* U.S. versus international performance where available

Important profitability metrics include:

* Revenue
* Revenue growth
* Adjusted EBITDA
* EBITDA margin
* Operating income
* Operating margin
* Operating cash flow
* Capital expenditures
* Free cash flow

Important balance-sheet and risk metrics include:

* Cash
* Debt
* Net debt
* Interest expense
* Lease liabilities
* Shares outstanding
* Share dilution
* Debt maturities where available
* Net debt relative to earnings/cash generation

## Revenue per Patron

A particularly important analytical relationship is:

```text
Average Ticket Price =
Admissions Revenue / Attendance

F&B per Patron =
Food & Beverage Revenue / Attendance

Core Revenue per Patron =
(Admissions Revenue + Food & Beverage Revenue)
/
Attendance
```

These metrics should help distinguish between:

* volume-led growth
* pricing-led growth
* concession monetization
* declining attendance being masked by higher spending per guest

## Volume vs Monetization

One useful analytical concept is to compare:

```text
Attendance Growth
vs
Revenue per Patron Growth
```

This creates four broad situations:

```text
                     Attendance Growth
                           ↑
                           │
        Volume-led        │        Strong on both
                           │
───────────────────────────┼────────────────────→
                           │         Revenue / Patron Growth
                           │
             Weak          │        Monetization-led
```

This is useful for comparing theater chains across quarters.

---

# Company Detail

Each company should have a deeper view showing its operating and financial history.

The company view should make it possible to understand:

* whether attendance is improving or declining
* how ticket pricing is changing
* how concession spending is changing
* whether revenue growth is translating into profits
* whether profits are translating into cash flow
* whether debt and interest obligations are manageable
* whether the company is issuing significant additional equity
* how the company's theater footprint is changing
* how U.S. and international operations differ

Important historical series include:

```text
Revenue

Attendance

Average Ticket Price

F&B per Patron

Revenue per Patron

Adjusted EBITDA

EBITDA Margin

Operating Income

Operating Cash Flow

Capital Expenditures

Free Cash Flow

Cash

Debt

Interest Expense

Lease Liabilities

Shares Outstanding

Theaters

Screens
```

## AMC-Specific Investor Context

AMC should receive particular attention because its equity analysis depends heavily on financial structure in addition to theater operating performance.

An investor analyzing AMC would care about:

* attendance recovery
* revenue per patron
* profitability
* cash burn or cash generation
* liquidity
* debt load
* refinancing risk
* interest expense
* lease obligations
* capital expenditures
* equity issuance
* dilution
* upcoming film supply

Strong box office alone should not automatically be interpreted as a strong equity outlook.

---

# Outlook

The outlook area should answer:

> Is the theatrical environment likely to improve or deteriorate over the coming months?

The primary forward-looking variable is the film slate.

Important information includes:

* Upcoming theatrical releases
* Releases during the next 30 days
* Releases during the next 90 days
* Releases during the next 180 days
* Releases by month
* Major upcoming titles
* Historical theatrical release volume
* Historical relationship between release volume and box office
* Historical blockbuster concentration
* Seasonal patterns

The dashboard should distinguish theatrical releases from digital or streaming releases.

The outlook should initially focus on observable indicators rather than attempting to predict exact movie grosses.

Potential future analytical work may include:

* slate-strength indicators
* historical relationships between release volume and industry revenue
* scenario analysis
* bull/base/bear industry scenarios
* company revenue sensitivity to industry box office
* simple forecasting models

These are extensions rather than requirements for the first version.

---

# Data Sources

The project should rely on publicly accessible information.

Core source categories include:

## Box Office Data

Public box-office websites such as:

* Box Office Mojo
* The Numbers

Potential data includes:

* movie grosses
* daily grosses
* historical grosses
* rankings
* release dates
* theater counts
* opening weekends
* distributors
* domestic/international/worldwide totals
* estimated ticket sales
* historical ticket pricing

Paid APIs are not required for this project.

## Public Company Financial Data

Primary sources include:

* SEC EDGAR
* 10-K filings
* 10-Q filings
* earnings releases
* company investor relations material

Financial information includes:

* revenue
* operating income
* net income
* cash
* debt
* leases
* interest expense
* cash flow
* capital expenditures
* shares outstanding

Company filings also contain theater-specific operating metrics that may not exist in standardized financial data.

## Movie Metadata and Future Releases

TMDB can provide:

* movie identity
* titles
* theatrical release dates
* posters
* genres
* production companies
* release type
* upcoming releases

TMDB popularity or similar metadata should not automatically be interpreted as financial demand forecasts.

---

# Core Data Domains

The data layer should eventually represent the following conceptual domains.

## Movies

A movie must be identifiable across multiple external sources.

Relevant information includes:

```text
Canonical Movie Identity
Source-Specific IDs
Title
Release Date
Distributor
Genres
Domestic Gross
International Gross
Worldwide Gross
Opening Weekend
Theater Count
Poster
```

Titles alone must not be treated as unique identifiers.

Cross-source mappings should remain correctable.

## Box Office Observations

The most useful fundamental observation is:

```text
Movie × Calendar Date
```

Relevant values include:

```text
Date
Movie
Gross
Rank
Theater Count
Per-Theater Average
Source
```

This dataset should support calculating industry-level aggregates without requiring separate authoritative copies of every possible summary metric.

## Theater Companies

Companies require:

```text
Identity
Ticker
Reporting Period
Geography
Operating Metrics
Financial Metrics
Source Information
```

Operating and financial reporting definitions may differ between companies.

Those differences should remain visible rather than being hidden through aggressive normalization.

## Upcoming Releases

Upcoming theatrical releases require:

```text
Movie
Region
Release Date
Release Type
Metadata
```

The dataset should support analysis of theatrical supply over future time windows.

---

# Important Definitions

## Domestic

In the theatrical industry, "domestic" commonly refers to the North American theatrical territory rather than strictly the United States.

The project's internal terminology should not incorrectly label this market as U.S.-only.

Where possible, preserve the exact territory definition used by each source.

## Calendar Periods

Industry sources may define theatrical years differently.

For internal analytical comparisons, the preferred concept is:

> Revenue earned on each actual calendar date.

For example:

```text
2025 Calendar Box Office =
Gross earned from January 1, 2025 through December 31, 2025
```

This allows comparable-period calculations to remain consistent.

## Missing Data

Missing values are not zero.

If a source does not disclose a value, that value should remain unknown.

## Reported vs Derived Metrics

Whenever possible, retain underlying reported values.

For example:

```text
Admissions Revenue
Attendance
```

are preferable as authoritative inputs to storing only:

```text
Average Ticket Price
```

Derived values can then be calculated consistently.

If a company explicitly reports a derived metric, both the reported metric and enough underlying data to independently calculate it should be preserved when possible.

---

# Data Provenance

The project should preserve enough information to trace important values back to their original source.

Relevant provenance may include:

```text
Source
Source Record Identifier
Source URL
Retrieved Date
Reporting Period
Geography
Currency
Unit
Whether Value Is Estimated
SEC Filing Accession
Form Type
Filing Date
Original Metric Name
```

Different sources may disagree.

Those disagreements should not be silently erased.

The goal is to maintain a reliable analytical dataset rather than create the illusion that every external source reports identical values.

---

# Data Quality Principles

The dashboard should favor correctness and explainability over completeness.

Important principles:

* Missing data remains missing.
* Source disagreements remain traceable.
* Monetary units are explicit.
* Currency is explicit.
* Geography is explicit.
* Reporting periods are explicit.
* Calendar periods and fiscal periods are not treated as interchangeable.
* Quarterly values and year-to-date values must not be confused.
* Company-specific definitions should be preserved.
* Derived metrics should only be calculated when their inputs are comparable.
* Suspicious observations should be surfaced rather than silently corrected.

---

# Initial Analytical Metrics

A strong first version should be able to support roughly the following core metrics.

## Industry

```text
Domestic Box Office
YTD Box Office
YoY Box Office Growth
Recovery vs 2019
Monthly Box Office
Cumulative Box Office
Release Count
Wide Release Count
Top-10 Film Concentration
Distributor Market Share
```

## Theater Operators

```text
Attendance
Attendance Growth
Average Ticket Price
F&B per Patron
Revenue per Patron
Revenue
Revenue Growth
Adjusted EBITDA
EBITDA Margin
Operating Margin
Operating Cash Flow
Capital Expenditures
Free Cash Flow
Cash
Debt
Net Debt
Interest Expense
Lease Liabilities
Shares Outstanding
Theaters
Screens
```

## Outlook

```text
Next 30-Day Release Count
Next 90-Day Release Count
Next 180-Day Release Count
Monthly Upcoming Release Count
Historical Release Volume
Release Volume vs Box Office
```

---

# Questions the Finished Product Should Answer

The project should eventually make it easy to answer questions such as:

1. Is North American theatrical box office actually recovering, or is growth primarily inflation and higher ticket prices?

2. How far is industry revenue from its pre-pandemic level?

3. Is attendance improving?

4. Is theatrical revenue becoming more concentrated among fewer blockbuster movies?

5. Is the upcoming release slate stronger or weaker than recent historical periods?

6. Which theater operator is growing attendance fastest?

7. Which operator generates the most ticket and concession revenue per customer?

8. Which theater operator converts revenue into operating profit most effectively?

9. Which operator has the strongest balance sheet?

10. How much financial risk does AMC's debt and interest burden create?

11. Is AMC generating enough cash to support its capital structure?

12. Is a company's revenue growth coming from more customers or simply higher spending per customer?

13. How much exposure does each operator have outside North America?

14. Does historical release volume meaningfully relate to box-office performance?

---

# Product Principles

The dashboard should be:

**Analytical, not encyclopedic.**

Every metric should contribute to understanding the health, economics, or outlook of the industry.

**Investor-oriented, not consumer-oriented.**

Movie posters and titles provide context, but the product is about business performance.

**Explainable.**

A user should be able to understand what a metric means and why it matters.

**Historically grounded.**

Current performance should usually be shown relative to prior periods rather than in isolation.

**Forward-looking where justified.**

Upcoming film supply is useful because it is observable. Speculative forecasts should be clearly separated from reported facts.

**Comparable without hiding differences.**

Company comparisons should acknowledge differences in reporting definitions.

**Public-data focused.**

The project should demonstrate what can be learned from publicly accessible industry and financial information.

---

# Non-Goals

The project does not initially need to become:

* a movie recommendation service
* a ticket-search service
* a complete movie database
* a real-time stock trading tool
* a valuation model
* a professional Bloomberg replacement
* a complete global film-industry database
* a sophisticated box-office prediction model
* an academic econometrics project
* a universal financial-data platform
* a universal web-scraping system

Those directions should only be added later if they directly improve the analytical product.

---

# End Goal

The finished project should demonstrate the ability to take fragmented real-world public data and turn it into a coherent industry analysis product.

Someone opening the dashboard should quickly be able to move from:

```text
How is the movie theater industry doing?
```

to:

```text
Why is it doing that?
```

to:

```text
Which companies are positioned best?
```

to:

```text
What could change over the next several months?
```

The strongest version of this project is not the one with the most metrics.

It is the one where the data, derived metrics, comparisons, and presentation combine into a clear analytical view of the theatrical exhibition business.

