import { useNavigate } from 'react-router-dom';
import { Calendar, ArrowRight, User } from 'lucide-react';
import { Breadcrumbs } from '@/src/components/common/Breadcrumbs';

const POSTS = [
  {
    id: '1',
    title: 'How Multi-Vendor Marketplaces Are Transforming Local Commerce in Ghana',
    excerpt: 'From Takoradi kitchens to nationwide delivery networks — discover how OmniMarket connects vendors, riders, and customers in one ecosystem.',
    author: 'Ama Mensah',
    date: 'Aug 4, 2026',
    category: 'Industry Insights',
    image: 'https://images.unsplash.com/photo-1555939592-152aeb0c6927?w=800&q=80',
  },
  {
    id: '2',
    title: '5 Tips for Restaurants to Boost Orders During Flash Sales',
    excerpt: 'Learn proven strategies from top-performing OmniMarket vendors who increased revenue by 40% using timed promotions and rider partnerships.',
    author: 'Kwame Asante',
    date: 'Jul 28, 2026',
    category: 'Vendor Growth',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
  },
  {
    id: '3',
    title: 'Why Customers Love Choosing Their Own Dispatch Rider',
    excerpt: 'Transparency, trust, and faster deliveries — how rider selection gives customers control and improves satisfaction scores across the platform.',
    author: 'Efua Boateng',
    date: 'Jul 15, 2026',
    category: 'Product Updates',
    image: 'https://images.unsplash.com/photo-1526367790999-015df668e107?w=800&q=80',
  },
  {
    id: '4',
    title: 'OmniMarket Wallet: Secure Payments for Vendors and Riders',
    excerpt: 'Instant MoMo payouts, commission tracking, and withdrawal history — everything you need to know about managing earnings on the platform.',
    author: 'Platform Team',
    date: 'Jul 2, 2026',
    category: 'Finance',
    image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&q=80',
  },
];

export function BlogPage() {
  const navigate = useNavigate();

  return (
    <div className="pb-16">
      <Breadcrumbs />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-3 pt-4">
          <h1 className="text-3xl sm:text-4xl font-heading font-black text-gray-900 dark:text-white">OmniMarket Blog</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">News, guides, and insights for customers, vendors, and dispatch riders.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {POSTS.map(post => (
            <article
              key={post.id}
              className="group sleek-card overflow-hidden hover:-translate-y-1 transition-all cursor-pointer"
              onClick={() => navigate('/about')}
            >
              <div className="aspect-[16/9] overflow-hidden">
                <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
              </div>
              <div className="p-6 space-y-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">{post.category}</span>
                <h2 className="text-lg font-heading font-black text-gray-900 dark:text-white group-hover:text-emerald-600 transition leading-snug">{post.title}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{post.excerpt}</p>
                <div className="flex items-center justify-between pt-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                  <span className="flex items-center gap-1"><User className="w-3 h-3" /> {post.author}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {post.date}</span>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-black text-blue-600 group-hover:gap-2 transition-all">
                  Read article <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
