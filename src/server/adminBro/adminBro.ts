import AdminBro from 'adminjs';
import { User } from '../../entities/user';
import AdminBroExpress from '@adminjs/express';
import config from '../../config';
import { redis } from '../../redis';
import { Database, Resource } from '@adminjs/typeorm';
import { logger } from '../../utils/logger';
import { IncomingMessage } from 'connect';
import { findUserById } from '../../repositories/userRepository';
import { fetchAdminAndValidatePassword } from '../../services/userService';
import { campaignsTab } from './tabs/campaignsTab';
import { broadcastNotificationTab } from './tabs/broadcastNotificationTab';
import { mainCategoryTab } from './tabs/mainCategoryTab';
import { categoryTab } from './tabs/categoryTab';
import { projectsTab } from './tabs/projectsTab';
import { organizationsTab } from './tabs/organizationsTab';
import { usersTab } from './tabs/usersTab';
import { projectStatusHistoryTab } from './tabs/projectStatusHistoryTab';
import { projectStatusReasonTab } from './tabs/projectStatusReasonTab';
import { projectAddressTab } from './tabs/projectAddressTab';
import { projectStatusTab } from './tabs/projectStatusTab';
import { projectUpdateTab } from './tabs/projectUpdateTab';
import { thirdPartProjectImportTab } from './tabs/thirdPartProjectImportTab';
import { featuredUpdateTab } from './tabs/featuredUpdateTab';
import { generateTokenTab } from './tabs/tokenTab';
import { donationTab } from './tabs/donationTab';
import { projectVerificationTab } from './tabs/projectVerificationTab';

// use redis for session data instead of in-memory storage
// tslint:disable-next-line:no-var-requires
// tslint:disable-next-line:no-var-requires
const session = require('express-session');
// tslint:disable-next-line:no-var-requires
const RedisStore = require('connect-redis')(session);
// tslint:disable-next-line:no-var-requires
const cookie = require('cookie');
// tslint:disable-next-line:no-var-requires
const cookieParser = require('cookie-parser');
const secret = config.get('ADMIN_BRO_COOKIE_SECRET') as string;
const adminBroCookie = 'adminbro';

AdminBro.registerAdapter({ Database, Resource });

export const getAdminBroRouter = async () => {
  return AdminBroExpress.buildAuthenticatedRouter(
    await getAdminBroInstance(),
    {
      authenticate: async (email, password): Promise<User | boolean> => {
        const admin = await fetchAdminAndValidatePassword({ email, password });
        if (!admin) {
          return false;
        }
        return admin;
      },
      cookiePassword: secret,
    },
    // custom router to save admin in req.session for express middlewares
    null,
    {
      // default values that will be deprecated, need to define them manually
      resave: false,
      saveUninitialized: true,
      rolling: false,
      secret,
      store: new RedisStore({
        client: redis,
      }),
    },
  );
};

// Express Middleware to save query of a search
export const adminBroQueryCache = async (req, res, next) => {
  if (
    req.url.startsWith('/admin/api/resources/Project/actions/list') &&
    req.headers.cookie.includes('adminbro')
  ) {
    const admin = await getCurrentAdminBroSession(req);
    if (!admin) return next(); // skip saving queries

    const queryStrings = {};
    // get URL query strings
    for (const key of Object.keys(req.query)) {
      const [_, filter] = key.split('.');
      if (!filter) continue;

      queryStrings[filter] = req.query[key];
    }
    // save query string for later use with an expiration
    await redis.set(
      `adminbro_${admin.id}_qs`,
      JSON.stringify(queryStrings),
      'ex',
      1800,
    );
  }
  next();
};

// Get CurrentSession for external express middlewares
export const getCurrentAdminBroSession = async (request: IncomingMessage) => {
  const cookieHeader = request.headers.cookie;
  const parsedCookies = cookie.parse(cookieHeader);
  const sessionStore = new RedisStore({ client: redis });
  const unsignedCookie = cookieParser.signedCookie(
    parsedCookies[adminBroCookie],
    secret,
  );

  let adminUser;
  try {
    adminUser = await new Promise((success, failure) => {
      sessionStore.get(unsignedCookie, (err, sessionObject) => {
        if (err) {
          failure(err);
        } else {
          success(sessionObject.adminUser);
        }
      });
    });
  } catch (e) {
    logger.error(e);
  }
  if (!adminUser) return false;

  const dbUser = await findUserById(adminUser.id);
  if (!dbUser) return false;

  return dbUser;
};

const getAdminBroInstance = async () => {
  return new AdminBro({
    branding: {
      logo: 'https://i.imgur.com/cGKo1Tk.png',
      favicon:
        'https://icoholder.com/media/cache/ico_logo_view_page/files/img/e15c430125a607a604a3aee82e65a8f7.png',
      companyName: 'Giveth',
      // softwareBrothers: false,
    },
    locale: {
      translations: {
        resources: {
          Donation: {
            properties: {
              transactionNetworkId: 'Network',
              transactionId: 'txHash',
              disperseTxHash:
                'disperseTxHash, this is optional, just for disperse transactions',
            },
          },
          // Project: {
          //   properties: {
          //     listed: 'Listed',
          //     'listed.true': 'Listed',
          //     'listed.false': 'Unlisted',
          //     'listed.null': 'Not Reviewed',
          //     'listed.undefined': 'Not Reviewed',
          //   },
          // },
        },
      },
      language: 'en',
    },
    resources: [
      projectVerificationTab,
      donationTab,
      await generateTokenTab(),
      featuredUpdateTab,
      thirdPartProjectImportTab,
      projectUpdateTab,
      projectStatusTab,
      projectAddressTab,
      projectStatusReasonTab,
      projectStatusHistoryTab,
      usersTab,
      organizationsTab,
      projectsTab,
      categoryTab,
      mainCategoryTab,
      broadcastNotificationTab,
      campaignsTab,
    ],
    rootPath: adminBroRootPath,
  });
};

export const adminBroRootPath = '/admin';
