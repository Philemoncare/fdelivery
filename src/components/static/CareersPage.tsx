import { MapPin, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/src/components/ui/button';
import { Breadcrumbs } from '@/src/components/common/Breadcrumbs';

const OPENINGS = [
  { title: 'Senior Frontend Engineer', team: 'Engineering', location: 'Takoradi / Remote', type: 'Full-time' },
  { title: 'Vendor Success Manager', team: 'Operations', location: 'Accra', type: 'Full-time' },
  { title: 'Dispatch Operations Lead', team: 'Logistics', location: 'Takoradi', type: 'Full-time' },
  { title: 'Product Designer', team: 'Design', location: 'Remote', type: 'Full-time' },
  { title: 'Customer Support Specialist', team: 'Support', location: 'Takoradi', type: 'Part-time' },
];

export function CareersPage() {
  const navigate = useNavigate();

  return (
    <div className="pb-16">
      <Breadcrumbs />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-4 pt-4">
          <h1 className="text-3xl sm:text-4xl font-heading font-black text-gray-900 dark:text-white">Build the Future of Commerce</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            Join OmniMarket and help connect millions of customers, vendors, and riders across Ghana and West Africa.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { stat: '120+', label: 'Team members' },
            { stat: '4 Cities', label: 'Active markets' },
            { stat: 'Hybrid', label: 'Work flexibility' },
          ].map(s => (
            <div key={s.label} className="sleek-card p-6 text-center">
              <p className="text-2xl font-black text-emerald-600">{s.stat}</p>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-heading font-black text-gray-900 dark:text-white">Open Positions</h2>
          {OPENINGS.map(job => (
            <div key={job.title} className="sleek-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-emerald-500/30 transition">
              <div>
                <h3 className="font-black text-gray-900 dark:text-white">{job.title}</h3>
                <div className="flex flex-wrap gap-3 mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  <span>{job.team}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {job.type}</span>
                </div>
              </div>
              <Button variant="outline" className="rounded-xl font-black text-xs shrink-0" onClick={() => navigate('/contact')}>
                Apply <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
