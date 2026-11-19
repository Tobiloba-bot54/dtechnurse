import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Gift } from 'lucide-react';
import { getSupabaseServerClient } from '@/lib/server/supabase-auth';
import { getRewardsOverview } from '@/lib/services/store/engagement';
import { getStoreSettings } from '@/lib/services/store/settings';
import { CopyCode } from '@/components/store/copy-code';
import { formatNaira, type RewardsOverview } from '@/lib/services/store/types';

export const metadata = { title: 'Rewards and referrals | DTECHNURSE' };

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

async function buildInviteLink(code: string): Promise<string> {
  try {
    const headerList = await headers();
    const host = headerList.get('host') || 'www.dtechnurse.com';
    const protocol = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https';
    return `${protocol}://${host}/signup?ref=${encodeURIComponent(code)}`;
  } catch {
    return `https://www.dtechnurse.com/signup?ref=${encodeURIComponent(code)}`;
  }
}

function RewardsContent({ rewards, inviteLink, loyaltyInactive }: { rewards: RewardsOverview; inviteLink: string; loyaltyInactive: boolean }) {
  return (
    <div className="rewards-grid">
      <section className="reward-card" aria-labelledby="loyalty-heading">
        <h2 id="loyalty-heading">Loyalty points</h2>
        {loyaltyInactive && <p><strong>Loyalty rewards are currently inactive.</strong></p>}
        <div className="reward-stat"><strong>{rewards.pointsBalance}</strong><span>Points balance</span></div>
        <div className="reward-stat"><strong>{rewards.lifetimePoints}</strong><span>Lifetime points</span></div>
        <h3>Point history</h3>
        {rewards.loyaltyTransactions.length === 0 ? (
          <p>No points earned yet. Points are added when you complete an order.</p>
        ) : (
          <ul>
            {rewards.loyaltyTransactions.map((transaction, index) => (
              <li key={index}>
                <strong>{transaction.points > 0 ? `+${transaction.points}` : transaction.points} points</strong>
                {transaction.description ? ` · ${transaction.description}` : ''}
                {formatDate(transaction.createdAt) ? ` · ${formatDate(transaction.createdAt)}` : ''}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="reward-card" aria-labelledby="referral-heading">
        <h2 id="referral-heading">Refer a colleague</h2>
        <p>Share your referral code or invite link. When a friend completes their first order, you earn {formatNaira(rewards.referralRewardAmountKobo)} as a thank you.</p>
        <CopyCode code={rewards.referralCode} />
        <p>Invite link: <span className="text-link">{inviteLink}</span></p>
        <h3>Your referrals</h3>
        {rewards.referrals.length === 0 ? (
          <p>No referrals yet. Share your code to start earning.</p>
        ) : (
          <table>
            <thead><tr><th scope="col">Friend</th><th scope="col">Status</th><th scope="col">Reward</th><th scope="col">Date</th></tr></thead>
            <tbody>
              {rewards.referrals.map((referral, index) => (
                <tr key={index}>
                  <td>{referral.refereeEmail}</td>
                  <td>{referral.status}</td>
                  <td>{formatNaira(referral.rewardAmountKobo)}</td>
                  <td>{formatDate(referral.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section className="reward-card" aria-labelledby="gift-cards-heading">
        <h2 id="gift-cards-heading">Gift cards</h2>
        {rewards.giftCards.length === 0 ? (
          <p>No gift cards are linked to your account yet. Enter a gift card code at checkout to use one.</p>
        ) : (
          <ul>
            {rewards.giftCards.map(giftCard => (
              <li key={giftCard.code}>
                <span className="code-chip">{giftCard.code}</span> · Balance {formatNaira(giftCard.balanceKobo)} · {giftCard.status}
                {giftCard.expiresAt && formatDate(giftCard.expiresAt) ? ` · Expires ${formatDate(giftCard.expiresAt)}` : ''}
              </li>
            ))}
          </ul>
        )}
        <p><Link className="text-link" href="/store">Browse the store</Link></p>
      </section>
    </div>
  );
}

export default async function RewardsPage() {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(`/login?next=${encodeURIComponent('/account/rewards')}`);
  const [rewards, settings] = await Promise.all([
    getRewardsOverview(data.user.id).catch(() => null),
    getStoreSettings().catch(() => null),
  ]);
  const inviteLink = rewards ? await buildInviteLink(rewards.referralCode) : '';
  return (
    <main className="content-page store-shell">
      <span className="eyebrow">YOUR ACCOUNT</span>
      <h1>Rewards and referrals</h1>
      <p className="lead">Track your loyalty points, share your referral link, and check your gift card balances.</p>
      {rewards ? (
        <RewardsContent rewards={rewards} inviteLink={inviteLink} loyaltyInactive={settings !== null && settings.loyaltyPointsPerOrder === 0} />
      ) : (
        <div className="empty-state">
          <Gift className="empty-state-icon" aria-hidden="true" />
          <h2>Rewards are unavailable right now</h2>
          <p>We could not load your rewards. Please refresh the page or contact support if it keeps happening.</p>
          <Link className="button" href="/contact">Contact support</Link>
        </div>
      )}
    </main>
  );
}
