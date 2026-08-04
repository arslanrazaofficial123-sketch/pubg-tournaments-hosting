import { ContentPage, ContentSection } from "@/components/layout/ContentPage";

export const metadata = {
  title: "Rules & Terms | EPIX Esports",
};

export default function RulesTermsPage() {
  return (
    <ContentPage
      heading="Rules & Terms"
      description="All participants must read and agree to these rules before registering for any event on this platform."
    >
      <ContentSection title="General Eligibility">
        <ul className="list-decimal space-y-2 pl-5">
          <li>Players must be 16 years or older to compete in ranked events.</li>
          <li>Each squad must have exactly 4 registered players and up to 2 substitutes.</li>
          <li>Accounts must be in good standing with no active game bans.</li>
          <li>One player may only be registered on a single squad per tournament.</li>
        </ul>
      </ContentSection>

      <ContentSection title="Match Rules">
        <ul className="list-decimal space-y-2 pl-5">
          <li>All official matches are played in TPP Squad mode unless stated otherwise.</li>
          <li>Players must join the custom room lobby 15 minutes before match start.</li>
          <li>Use of exploits, glitches, or third-party cheats results in immediate disqualification.</li>
          <li>Teaming with other squads is prohibited and will lead to a ban from future events.</li>
          <li>Match admins have final authority on all in-game disputes.</li>
        </ul>
      </ContentSection>

      <ContentSection title="Prize Distribution">
        <p>
          Prize pools are distributed within 14 business days after tournament
          conclusion. Winnings are paid via bank transfer or mobile wallet to
          the team captain, who is responsible for splitting among roster
          members. A valid government ID is required for payouts above $500.
        </p>
      </ContentSection>

      <ContentSection title="Terms of Service">
        <p>
          By registering on this platform, you agree to our privacy policy,
          accept that match footage may be broadcast publicly, and acknowledge
          that tournament schedules may change due to technical issues or force
          majeure. We reserve the right to modify brackets, rules, or prize
          splits with prior notice to affected teams.
        </p>
        <p>
          This platform is a fan-hosted tournament hub and is not affiliated
          with or endorsed by Krafton, Inc.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
